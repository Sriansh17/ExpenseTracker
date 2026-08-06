const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const AppError = require('../utils/appError');

function authenticate(req, _res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.userId = payload.userId;
    next();
  } catch (_error) {
    next(new AppError('UNAUTHORIZED', 'Invalid or expired token', 401));
  }
}

module.exports = { authenticate };
