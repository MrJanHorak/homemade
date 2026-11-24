import { createHmac } from 'node:crypto';
import { AuthRateLimit } from '../models/authRateLimit.js';

// A bounded per-process limit for local development.
const createAuthRateLimit = ({ limit = 30, windowMs = 15 * 60 * 1000, maxKeys = 10000, now = Date.now } = {}) => {
  const buckets = new Map();
  return (req, res, next) => {
    const time = now();
    const key = req.ip || 'unknown';
    let bucket = buckets.get(key);
    if (!bucket || bucket.expiresAt <= time) {
      if (!bucket && buckets.size >= maxKeys) {
        for (const [entryKey, entry] of buckets) {
          if (entry.expiresAt <= time) buckets.delete(entryKey);
        }
        if (buckets.size >= maxKeys) buckets.delete(buckets.keys().next().value);
      }
      bucket = { count: 0, expiresAt: time + windowMs };
      buckets.delete(key);
      buckets.set(key, bucket);
    }
    if (bucket.count >= limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.expiresAt - time) / 1000))));
      res.status(429).json({ error: 'Too many sign-in attempts. Please try again later.' });
      return;
    }
    bucket.count += 1;
    next();
  };
};

const createMongoAuthRateLimit = ({ limit = 30, windowMs = 15 * 60 * 1000, now = Date.now } = {}) => async (req, res, next) => {
  try {
    const time = now();
    const window = Math.floor(time / windowMs);
    const resetAt = (window + 1) * windowMs;
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error('SESSION_SECRET is required for shared sign-in throttling.');

    const id = createHmac('sha256', secret)
      .update(`${window}:${req.ip || 'unknown'}`)
      .digest('hex');
    const incrementBucket = () => AuthRateLimit.findOneAndUpdate(
      { _id: id },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(resetAt) },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean().exec();

    let bucket;
    try {
      bucket = await incrementBucket();
    } catch (error) {
      // Concurrent first requests can race to upsert the same unique _id.
      if (error.code !== 11000) throw error;
      bucket = await incrementBucket();
    }

    if (bucket.count > limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((resetAt - time) / 1000))));
      res.status(429).json({ error: 'Too many sign-in attempts. Please try again later.' });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export { createAuthRateLimit, createMongoAuthRateLimit };
