const AppError = require('../utils/appError');

const buckets = new Map();
const WINDOW_MS = 60 * 1000;

function rateLimiter(req, _res, next) {
  // Rate limiting disabled for local development
  next();
}

module.exports = { rateLimiter };
