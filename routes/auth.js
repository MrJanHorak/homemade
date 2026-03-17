import { Router } from 'express';
import crypto from 'crypto';
import passport from 'passport';
import { Profile } from '../models/profile.js';
import { User } from '../models/user.js';

const router = Router();
const PASSWORD_MIN_LENGTH = 8;
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

const hashToken = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

const createToken = () => crypto.randomBytes(32).toString('hex');

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const getDefaultNameFromEmail = (email) => {
  const [localPart] = email.split('@');
  return localPart || 'New Maker';
};

const buildAvatarFromName = (name) => {
  const seed = encodeURIComponent(name || 'maker');
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}`;
};

const hashPassword = (
  password,
  salt = crypto.randomBytes(16).toString('hex'),
) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return {
    salt,
    hash,
  };
};

const verifyPassword = (password, salt, storedHash) => {
  if (!salt || !storedHash) {
    return false;
  }

  const computedHash = crypto.scryptSync(password, salt, 64);
  const storedHashBuffer = Buffer.from(storedHash, 'hex');

  if (storedHashBuffer.length !== computedHash.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedHashBuffer, computedHash);
};

const loginUser = (req, user) =>
  new Promise((resolve, reject) => {
    req.login(user, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const getFrontendBaseUrl = () => {
  const configuredBaseUrl =
    process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN;

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3001';
  }

  return '/';
};

const sanitizeReturnTo = (returnTo) => {
  if (typeof returnTo !== 'string') {
    return null;
  }

  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return null;
  }

  return returnTo;
};

const buildFrontendRedirect = (returnTo = '/') => {
  const frontendBaseUrl = getFrontendBaseUrl();

  if (frontendBaseUrl === '/') {
    return returnTo;
  }

  return new URL(returnTo, frontendBaseUrl).toString();
};

const storeReturnTo = (req, res, next) => {
  const returnTo = sanitizeReturnTo(req.query.returnTo);

  if (returnTo) {
    req.session.returnTo = returnTo;
  }

  next();
};

const ensureStrategyEnabled = (strategyName) => (req, res, next) => {
  if (passport._strategy(strategyName)) {
    next();
    return;
  }

  res.status(503).json({ error: `${strategyName} sign-in is not configured.` });
};

const finalizeSocialLogin = (req, res) => {
  const returnTo = sanitizeReturnTo(req.session.returnTo) || '/';
  delete req.session.returnTo;
  res.redirect(buildFrontendRedirect(returnTo));
};

const buildVerificationLink = (token) => {
  const frontendBaseUrl = getFrontendBaseUrl();

  if (frontendBaseUrl === '/') {
    return `/auth/verify-email?token=${encodeURIComponent(token)}`;
  }

  return new URL(
    `/auth/verify-email?token=${encodeURIComponent(token)}`,
    frontendBaseUrl,
  ).toString();
};

const buildMagicLink = (token, returnTo = '/') => {
  const frontendBaseUrl = getFrontendBaseUrl();
  const query = new URLSearchParams({
    token,
    returnTo,
  }).toString();

  if (frontendBaseUrl === '/') {
    return `/auth/magic-link?${query}`;
  }

  return new URL(`/auth/magic-link?${query}`, frontendBaseUrl).toString();
};

const sendAuthEmail = async ({ to, subject, body, link }) => {
  // MVP delivery path: log links in development so flows are testable without SMTP.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[auth-email] ${subject} -> ${to}`);
    console.log(`[auth-email] ${body}`);
    console.log(`[auth-email] ${link}`);
  }
};

router.post('/signup', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password =
      typeof req.body.password === 'string' ? req.body.password : '';
    const providedName =
      typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      res
        .status(400)
        .json({
          error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
        });
      return;
    }

    const existingUser = await User.findOne({ email }).exec();

    if (existingUser) {
      res
        .status(409)
        .json({ error: 'An account with this email already exists.' });
      return;
    }

    const { salt, hash } = hashPassword(password);
    const token = createToken();
    const tokenHash = hashToken(token);
    const tokenExpiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);

    const profile = new Profile({
      name: providedName || getDefaultNameFromEmail(email),
      avatar: buildAvatarFromName(
        providedName || getDefaultNameFromEmail(email),
      ),
    });
    await profile.save();

    const user = new User({
      email,
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: tokenExpiresAt,
      profile: profile._id,
    });

    await user.save();

    const verificationLink = buildVerificationLink(token);

    await sendAuthEmail({
      to: email,
      subject: 'Verify your Homemade account',
      body: 'Click the link below to verify your account.',
      link: verificationLink,
    });

    res.status(201).json({
      message: 'Account created. Check your email to verify your account.',
      verificationLink:
        process.env.NODE_ENV !== 'production' ? verificationLink : undefined,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password =
      typeof req.body.password === 'string' ? req.body.password : '';

    const user = await User.findOne({ email }).exec();
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const validPassword = verifyPassword(
      password,
      user.passwordSalt,
      user.passwordHash,
    );
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.emailVerified) {
      res
        .status(403)
        .json({ error: 'Please verify your email before signing in.' });
      return;
    }

    await loginUser(req, user);

    res.json({ message: 'Signed in successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const token =
      typeof req.body.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      res.status(400).json({ error: 'Verification token is required.' });
      return;
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    }).exec();

    if (!user) {
      res
        .status(400)
        .json({ error: 'This verification link is invalid or expired.' });
      return;
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    await loginUser(req, user);

    res.json({ message: 'Email verified and signed in.' });
  } catch (error) {
    next(error);
  }
});

router.post('/magic-link/request', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const returnTo = sanitizeReturnTo(req.body.returnTo) || '/';

    const user = await User.findOne({ email }).exec();

    if (user && user.emailVerified) {
      const token = createToken();
      const tokenHash = hashToken(token);

      user.magicLoginTokenHash = tokenHash;
      user.magicLoginExpiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
      await user.save();

      const magicLink = buildMagicLink(token, returnTo);

      await sendAuthEmail({
        to: email,
        subject: 'Your Homemade sign-in link',
        body: 'Click the link below to sign in.',
        link: magicLink,
      });

      res.json({
        message: 'If an account exists, a sign-in link has been sent.',
        magicLink:
          process.env.NODE_ENV !== 'production' ? magicLink : undefined,
      });
      return;
    }

    res.json({
      message: 'If an account exists, a sign-in link has been sent.',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/magic-link/consume', async (req, res, next) => {
  try {
    const token =
      typeof req.body.token === 'string' ? req.body.token.trim() : '';

    if (!token) {
      res.status(400).json({ error: 'Magic link token is required.' });
      return;
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      magicLoginTokenHash: tokenHash,
      magicLoginExpiresAt: { $gt: new Date() },
    }).exec();

    if (!user) {
      res.status(400).json({ error: 'This magic link is invalid or expired.' });
      return;
    }

    user.magicLoginTokenHash = undefined;
    user.magicLoginExpiresAt = undefined;
    user.emailVerified = true;
    await user.save();

    await loginUser(req, user);

    res.json({ message: 'Signed in successfully with magic link.' });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email/resend', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email }).exec();

    if (!user || user.emailVerified) {
      res.json({
        message:
          'If an unverified account exists, a verification email was sent.',
      });
      return;
    }

    const token = createToken();
    user.emailVerificationTokenHash = hashToken(token);
    user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
    await user.save();

    const verificationLink = buildVerificationLink(token);

    await sendAuthEmail({
      to: email,
      subject: 'Verify your Homemade account',
      body: 'Click the link below to verify your account.',
      link: verificationLink,
    });

    res.json({
      message:
        'If an unverified account exists, a verification email was sent.',
      verificationLink:
        process.env.NODE_ENV !== 'production' ? verificationLink : undefined,
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/google',
  ensureStrategyEnabled('google'),
  storeReturnTo,
  passport.authenticate('google', { scope: ['profile', 'email'] }),
);

router.get(
  '/google/oauth2callback',
  ensureStrategyEnabled('google'),
  passport.authenticate('google', {
    failureRedirect: '/auth/google',
  }),
  finalizeSocialLogin,
);

router.get(
  '/github',
  ensureStrategyEnabled('github'),
  storeReturnTo,
  passport.authenticate('github', { scope: ['user:email'] }),
);

router.get(
  '/github/callback',
  ensureStrategyEnabled('github'),
  passport.authenticate('github', {
    failureRedirect: '/auth/github',
  }),
  finalizeSocialLogin,
);

router.get(
  '/microsoft',
  ensureStrategyEnabled('microsoft'),
  storeReturnTo,
  passport.authenticate('microsoft', { scope: ['user.read'] }),
);

router.get(
  '/microsoft/callback',
  ensureStrategyEnabled('microsoft'),
  passport.authenticate('microsoft', {
    failureRedirect: '/auth/microsoft',
  }),
  finalizeSocialLogin,
);

router.get(
  '/apple',
  ensureStrategyEnabled('apple'),
  storeReturnTo,
  passport.authenticate('apple'),
);

router.get(
  '/apple/callback',
  ensureStrategyEnabled('apple'),
  passport.authenticate('apple', {
    failureRedirect: '/auth/apple',
  }),
  finalizeSocialLogin,
);

router.post(
  '/apple/callback',
  ensureStrategyEnabled('apple'),
  passport.authenticate('apple', {
    failureRedirect: '/auth/apple',
  }),
  finalizeSocialLogin,
);

router.get('/logout', function (req, res) {
  req.logout(() => res.redirect(buildFrontendRedirect('/')));
});

export { router };
