import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/user.js';
import { Profile } from '../models/profile.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await User.findOne({ googleId: profile.id }).exec();

        if (user) {
          return done(null, user);
        } else {
          const newProfile = new Profile({
            name: profile.displayName,
            avatar: profile.photos[0].value,
          });

          const newUser = new User({
            email: profile.emails[0].value,
            googleId: profile.id,
            profile: newProfile._id,
          });

          await newProfile.save();
          await newUser.save();

          return done(null, newUser);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
      .populate('profile', 'name avatar')
      .exec();

    done(null, user);
  } catch (err) {
    done(err);
  }
});
