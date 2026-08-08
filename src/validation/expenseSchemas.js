const Joi = require('joi');
const { isValidDate } = require('../utils/dateHelpers');

const date = Joi.string().custom((value, helpers) => isValidDate(value) ? value : helpers.error('date.format')).messages({ 'date.format': '{{#label}} must be a valid YYYY-MM-DD date' });
const notFuture = date.custom((value, helpers) => value > new Date().toISOString().slice(0, 10) ? helpers.error('date.future') : value).messages({ 'date.future': '{{#label}} cannot be in the future' });
const uuid = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });
const tags = Joi.array().items(Joi.string().trim().max(50)).max(10);

module.exports = {
  id: Joi.object({ id: uuid.required() }),
  create: Joi.object({ amount: Joi.number().integer().min(1).max(999999999).required(), categoryId: uuid.required(), date: notFuture.required(), notes: Joi.string().max(500).allow('').optional(), merchant: Joi.string().max(200).allow('').optional(), tags: tags.optional() }),
  update: Joi.object({ amount: Joi.number().integer().min(1).max(999999999), categoryId: uuid, date: notFuture, notes: Joi.string().max(500).allow(''), tags }).min(1),
  list: Joi.object({ page: Joi.number().integer().min(1).default(1), pageSize: Joi.number().integer().min(1).max(100).default(20), month: Joi.string().pattern(/^\d{4}-\d{2}$/).optional(), category: uuid, startDate: date, endDate: date, minAmount: Joi.number().integer().min(0), maxAmount: Joi.number().integer().min(0), tags: Joi.alternatives().try(tags, Joi.string().custom((v) => v.split(',').map((x) => x.trim()).filter(Boolean))), search: Joi.string().min(1).max(200) })
};
