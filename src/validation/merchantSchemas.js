const Joi = require('joi');

const upsertMerchant = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  categoryId: Joi.string().uuid({ version: 'uuidv4' }).required()
});

const lookupQuery = Joi.object({
  name: Joi.string().trim().min(1).max(200).required()
});

const merchantParam = Joi.object({
  name: Joi.string().trim().min(1).max(200).required()
});

module.exports = { upsertMerchant, lookupQuery, merchantParam };
