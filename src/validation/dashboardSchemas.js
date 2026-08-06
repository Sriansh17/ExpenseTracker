const Joi = require('joi');
const { isValidDate } = require('../utils/dateHelpers');
const date = Joi.string().custom((value, helpers) => isValidDate(value) ? value : helpers.error('date.format'));
module.exports = { charts: Joi.object({ startDate: date, endDate: date }) };
