const Joi = require('joi');

const password = Joi.string().min(8).max(72)
  .pattern(/[A-Z]/).pattern(/[a-z]/).pattern(/[0-9]/).pattern(/[^A-Za-z0-9]/)
  .required();
const email = Joi.string().email().max(254).required();

module.exports = {
  register: Joi.object({ email, password, displayName: Joi.string().trim().min(1).max(100).optional() }),
  login: Joi.object({ email, password }),
  googleAuth: Joi.object({ idToken: Joi.string().required() }),
  refresh: Joi.object({ refreshToken: Joi.string().required() }),
  changePassword: Joi.object({ currentPassword: Joi.string().required(), newPassword: password })
};
