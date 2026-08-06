const Joi = require('joi');

const id = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).required();
const fields = {
  name: Joi.string().trim().min(1).max(50).required(),
  icon: Joi.string().trim().max(100).optional()
};

module.exports = {
  id: Joi.object({ id }),
  create: Joi.object(fields),
  update: Joi.object({ name: fields.name.optional(), icon: fields.icon }).min(1)
};
