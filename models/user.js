import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: String,
    googleId: String,
    githubId: String,
    microsoftId: String,
    appleId: String,
    passwordHash: String,
    passwordSalt: String,
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: String,
    emailVerificationExpiresAt: Date,
    magicLoginTokenHash: String,
    magicLoginExpiresAt: Date,
    profile: { type: Schema.Types.ObjectId, ref: 'Profile' },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model('User', userSchema);

export { User };
