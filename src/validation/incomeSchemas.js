const Joi = require('joi');
const { isValidDate } = require('../utils/dateHelpers');
const date = Joi.string().custom((value, helpers) => !isValidDate(value) ? helpers.error('date.format') : value).custom((value, helpers) => value > new Date().toISOString().slice(0, 10) ? helpers.error('date.future') : value);
const uuid = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });
module.exports = {
  id: Joi.object({ id: uuid.required() }),
  create: Joi.object({ amount: Joi.number().integer().min(1).max(99999999999).required(), source: Joi.string().trim().min(1).max(200).required(), date: date.required(), notes: Joi.string().max(500).allow('').optional(), tags: Joi.array().items(Joi.string().trim().max(30)).max(10).optional() }),
  update: Joi.object({ amount: Joi.number().integer().min(1).max(99999999999), source: Joi.string().trim().min(1).max(200), date, notes: Joi.string().max(500).allow(''), tags: Joi.array().items(Joi.string().trim().max(30)).max(10) }).min(1),
  list: Joi.object({ page: Joi.number().integer().min(1).default(1), pageSize: Joi.number().integer().min(1).max(100).default(20) })
};
