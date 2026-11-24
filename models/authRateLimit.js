import mongoose from 'mongoose';

const authRateLimitSchema = new mongoose.Schema({
  _id: { type: String },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
});

authRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthRateLimit = mongoose.model('AuthRateLimit', authRateLimitSchema);

export { AuthRateLimit };
