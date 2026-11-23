import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
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

const findOrCreateOAuthUser = async ({
  providerField,
  providerId,
  email,
  emailVerified = false,
  displayName,
  avatar,
}) => {
  const normalizedEmail =
    typeof email === 'string' ? email.toLowerCase() : undefined;

  if (typeof providerId !== 'string' || !providerId) return false;
  const providerMatch = await User.findOne({ [providerField]: providerId }).exec();
  if (providerMatch) return providerMatch;

  if (normalizedEmail && await User.exists({ email: normalizedEmail })) return false;

  const name =
    displayName || getDefaultNameFromEmail(normalizedEmail || 'maker@local');
  const newProfile = new Profile({
    name,
    avatar: avatar || buildAvatarFromName(name),
  });

  const newUser = new User({
    email: emailVerified ? normalizedEmail : undefined,
    [providerField]: providerId,
    emailVerified: Boolean(emailVerified && normalizedEmail),
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
        state: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            providerField: 'googleId',
            providerId: String(profile.id ?? ''),
            email: profile.emails?.[0]?.value,
            emailVerified: profile.emails?.[0]?.verified === true,
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
        state: true,
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            providerField: 'githubId',
            providerId: String(profile.id ?? ''),
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
        state: true,
        scope: ['user.read'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            providerField: 'microsoftId',
            providerId: String(profile.id ?? ''),
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
