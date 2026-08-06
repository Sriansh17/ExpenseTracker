const { randomUUID } = require('crypto');

function requestId(req, res, next) {
  const id = req.get('x-request-id') || randomUUID();
  req.requestId = id;
  res.set('x-request-id', id);
  next();
}

module.exports = { requestId };
