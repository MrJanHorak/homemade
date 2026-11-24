// A bounded per-process limit. Deployments with multiple instances need a shared limiter.
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

export { createAuthRateLimit };
