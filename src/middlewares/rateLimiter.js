const AppError = require('../utils/appError');

const buckets = new Map();
const WINDOW_MS = 60 * 1000;

function rateLimiter(req, _res, next) {
  const key = req.userId ? `user:${req.userId}` : `ip:${req.ip}`;
  const limit = req.userId ? 100 : 30;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return next();
  }
  if (++entry.count > limit) return next(new AppError('RATE_LIMITED', 'Too many requests', 429));
  next();
}

module.exports = { rateLimiter };
