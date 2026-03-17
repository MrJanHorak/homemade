import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as AppleStrategy } from 'passport-apple';
import { User } from '../models/user.js';
import { Profile } from '../models/profile.js';

const getDefaultNameFromEmail = (email) => {
  const [localPart] = (email || '').split('@');
  return localPart || 'New Maker';
};

const buildAvatarFromName = (name) => {
  const seed = encodeURIComponent(name || 'maker');
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}`;
};

const decodeJwtPayload = (jwt) => {
  if (typeof jwt !== 'string') {
    return {};
  }

  const parts = jwt.split('.');
  if (parts.length < 2) {
    return {};
  }

  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return {};
  }
};

const findOrCreateOAuthUser = async ({
  providerField,
  providerId,
  email,
  displayName,
  avatar,
}) => {
  const normalizedEmail =
    typeof email === 'string' ? email.toLowerCase() : undefined;

  if (providerId) {
    const providerMatch = await User.findOne({
      [providerField]: providerId,
    }).exec();

    if (providerMatch) {
      if (!providerMatch.emailVerified) {
        providerMatch.emailVerified = true;
        await providerMatch.save();
      }

      return providerMatch;
    }
  }

  if (normalizedEmail) {
    const emailMatch = await User.findOne({ email: normalizedEmail }).exec();

    if (emailMatch) {
      if (providerId) {
        emailMatch[providerField] = providerId;
      }
      emailMatch.emailVerified = true;
      await emailMatch.save();
      return emailMatch;
    }
  }

  const name =
    displayName || getDefaultNameFromEmail(normalizedEmail || 'maker@local');
  const newProfile = new Profile({
    name,
    avatar: avatar || buildAvatarFromName(name),
  });

  const newUser = new User({
    email: normalizedEmail,
    [providerField]: providerId,
    emailVerified: true,
    profile: newProfile._id,
  });

  await newProfile.save();
  await newUser.save();

  return newUser;
};

if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_SECRET &&
  process.env.GOOGLE_CALLBACK
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            providerField: 'googleId',
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName,
            avatar: profile.photos?.[0]?.value,
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

if (
  process.env.GITHUB_CLIENT_ID &&
  process.env.GITHUB_CLIENT_SECRET &&
  process.env.GITHUB_CALLBACK
) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK,
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            providerField: 'githubId',
            providerId: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName || profile.username,
            avatar: profile.photos?.[0]?.value,
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

if (
  process.env.MICROSOFT_CLIENT_ID &&
  process.env.MICROSOFT_CLIENT_SECRET &&
  process.env.MICROSOFT_CALLBACK
) {
  passport.use(
    new MicrosoftStrategy(
      {
        clientID: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        callbackURL: process.env.MICROSOFT_CALLBACK,
        scope: ['user.read'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            providerField: 'microsoftId',
            providerId: profile.id,
            email:
              profile.emails?.[0]?.value ||
              profile._json?.mail ||
              profile._json?.userPrincipalName,
            displayName: profile.displayName,
            avatar: undefined,
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

if (
  process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID &&
  process.env.APPLE_PRIVATE_KEY &&
  process.env.APPLE_CALLBACK
) {
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        callbackURL: process.env.APPLE_CALLBACK,
      },
      async (accessToken, refreshToken, idToken, profile, done) => {
        try {
          const tokenPayload = decodeJwtPayload(idToken);
          const appleEmail =
            profile?.email || tokenPayload.email || profile?._json?.email;
          const appleSub = profile?.id || tokenPayload.sub;
          const user = await findOrCreateOAuthUser({
            providerField: 'appleId',
            providerId: appleSub,
            email: appleEmail,
            displayName:
              profile?.displayName || getDefaultNameFromEmail(appleEmail),
            avatar: undefined,
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
      .populate('profile', 'name avatar role')
      .exec();

    done(null, user);
  } catch (err) {
    done(err);
  }
});
