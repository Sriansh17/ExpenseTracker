const logger = require('../config/logger');

function errorHandler(error, req, res, _next) {
  const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
  const code = error.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  if (statusCode >= 500) logger.error(error.message, { requestId: req.requestId, stack: error.stack });
  res.status(statusCode).json({ code, message: statusCode >= 500 ? 'Internal server error' : error.message, ...(error.details ? { details: error.details } : {}) });
}

module.exports = { errorHandler };
