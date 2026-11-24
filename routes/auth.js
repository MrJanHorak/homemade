import { Router } from 'express';
import crypto from 'crypto';
import { promisify } from 'node:util';
import passport from 'passport';
import { Profile } from '../models/profile.js';
import { User } from '../models/user.js';
import { authDebugLinksEnabled } from '../lib/auth-email.js';
import { safeReturnTo } from '../lib/return-to.js';
import { createAuthRateLimit } from '../middleware/authRateLimit.js';

const router = Router();
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 1024;
const scrypt = promisify(crypto.scrypt);
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

const hashPassword = async (
  password,
  salt = crypto.randomBytes(16).toString('hex'),
) => {
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  return {
    salt,
    hash,
  };
};

const verifyPassword = async (password, salt, storedHash) => {
  if (!salt || !storedHash) {
    return false;
  }

  const computedHash = await scrypt(password, salt, 64);
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

const buildFrontendRedirect = (returnTo = '/') => {
  const frontendBaseUrl = getFrontendBaseUrl();

  if (frontendBaseUrl === '/') {
    return returnTo;
  }

  return new URL(returnTo, frontendBaseUrl).toString();
};

const storeReturnTo = (req, res, next) => {
  req.session.returnTo = safeReturnTo(req.query.returnTo);
  next();
};

const ensureStrategyEnabled = (strategyName) => (req, res, next) => {
  if (passport._strategy(strategyName)) {
    next();
    return;
  }

  res.status(503).json({ error: `${strategyName} sign-in is not configured.` });
};

const finishSocialLogin = (strategy) => (req, res, next) => {
  const returnTo = safeReturnTo(req.session.returnTo);
  const signInQuery = new URLSearchParams({ returnTo, error: 'provider' });
  passport.authenticate(strategy, {
    failureRedirect: buildFrontendRedirect(`/auth/sign-in?${signInQuery}`),
  })(req, res, (error) => {
    if (error) return next(error);
    res.redirect(buildFrontendRedirect(returnTo));
  });
};

const buildVerificationLink = (token, returnTo) => {
  const frontendBaseUrl = getFrontendBaseUrl();
  const query = new URLSearchParams({ token, returnTo });

  if (frontendBaseUrl === '/') {
    return `/auth/verify-email?${query}`;
  }

  return new URL(
    `/auth/verify-email?${query}`,
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

const requireEmailDelivery = (req, res, next) => {
  if (authDebugLinksEnabled()) return next();
  res.status(503).json({ error: 'Email delivery is unavailable. Choose another sign-in option.' });
};

const authRateLimit = createAuthRateLimit();
router.use(['/signup', '/login', '/verify-email', '/verify-email/resend', '/magic-link/request', '/magic-link/consume'], (req, res, next) => {
  if (req.method !== 'POST') return next();
  return authRateLimit(req, res, next);
});

router.post('/signup', requireEmailDelivery, async (req, res, next) => {
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

    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      res
        .status(400)
        .json({
          error: `Password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`,
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

    const { salt, hash } = await hashPassword(password);
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

    res.status(201).json({
      message: 'Account created. Use the local verification link to continue.',
      verificationLink: buildVerificationLink(token, safeReturnTo(req.body.returnTo)),
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

    const validPassword = password.length <= PASSWORD_MAX_LENGTH && await verifyPassword(
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
    const user = await User.findOneAndUpdate(
      { emailVerificationTokenHash: tokenHash, emailVerificationExpiresAt: { $gt: new Date() } },
      { $set: { emailVerified: true }, $unset: { emailVerificationTokenHash: 1, emailVerificationExpiresAt: 1 } },
      { new: true },
    ).exec();

    if (!user) {
      res
        .status(400)
        .json({ error: 'This verification link is invalid or expired.' });
      return;
    }

    await loginUser(req, user);

    res.json({ message: 'Email verified and signed in.' });
  } catch (error) {
    next(error);
  }
});

router.post('/magic-link/request', requireEmailDelivery, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const returnTo = safeReturnTo(req.body.returnTo);

    const user = await User.findOne({ email }).exec();

    if (user && user.emailVerified) {
      const token = createToken();
      const tokenHash = hashToken(token);

      user.magicLoginTokenHash = tokenHash;
      user.magicLoginExpiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
      await user.save();

      res.json({
        message: 'Use the local sign-in link to continue.',
        magicLink: buildMagicLink(token, returnTo),
      });
      return;
    }

    res.json({
      message: 'No local sign-in link was generated.',
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
    const user = await User.findOneAndUpdate(
      { magicLoginTokenHash: tokenHash, magicLoginExpiresAt: { $gt: new Date() }, emailVerified: true },
      { $unset: { magicLoginTokenHash: 1, magicLoginExpiresAt: 1 } },
      { new: true },
    ).exec();

    if (!user) {
      res.status(400).json({ error: 'This magic link is invalid or expired.' });
      return;
    }

    await loginUser(req, user);

    res.json({ message: 'Signed in successfully with magic link.' });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email/resend', requireEmailDelivery, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email }).exec();

    if (!user || user.emailVerified) {
      res.json({
        message:
          'No local verification link was generated.',
      });
      return;
    }

    const token = createToken();
    user.emailVerificationTokenHash = hashToken(token);
    user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
    await user.save();

    res.json({
      message: 'Use the local verification link to continue.',
      verificationLink: buildVerificationLink(token, safeReturnTo(req.body.returnTo)),
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
  finishSocialLogin('google'),
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
  finishSocialLogin('github'),
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
  finishSocialLogin('microsoft'),
);

router.post('/logout', function (req, res, next) {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((destroyError) => {
      if (destroyError) return next(destroyError);
      res.clearCookie('connect.sid').sendStatus(204);
    });
  });
});

export { router };
