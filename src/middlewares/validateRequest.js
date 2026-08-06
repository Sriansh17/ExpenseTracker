const AppError = require('../utils/appError');

function validateRequest(schema, type = 'body') {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[type], { abortEarly: false, stripUnknown: true });
    if (error) {
      return next(new AppError('VALIDATION_ERROR', 'Request validation failed', 400,
        error.details.map((detail) => ({ path: detail.path, message: detail.message }))));
    }
    req[type] = value;
    next();
  };
}

module.exports = { validateRequest };
