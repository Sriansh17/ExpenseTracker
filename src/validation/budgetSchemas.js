const Joi = require('joi');
const uuid = Joi.string().guid({ version: ['uuidv4', 'uuidv5'] });
module.exports = { monthly: Joi.object({ amount: Joi.number().integer().min(1).max(999999999).required() }), category: Joi.object({ categoryId: uuid.required(), amount: Joi.number().integer().min(1).max(999999999).required() }) };
