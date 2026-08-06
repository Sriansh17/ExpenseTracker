const logger = require('../config/logger');

function requestLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => logger.info('request completed', {
    requestId: req.requestId, method: req.method, endpoint: req.originalUrl,
    statusCode: res.statusCode, durationMs: Date.now() - started
  }));
  next();
}

module.exports = { requestLogger };
