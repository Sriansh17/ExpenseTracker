const merchantService = require('../services/merchantService');

async function lookup(req, res, next) {
  try {
    const { name } = req.query;
    const merchant = await merchantService.lookup(req.userId, name);
    if (!merchant) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'No mapping found for this merchant' });
    }
    return res.json({ code: 'MERCHANT_FOUND', message: 'Merchant mapping found', merchant });
  } catch (e) {
    next(e);
  }
}

async function list(req, res, next) {
  try {
    const merchants = await merchantService.list(req.userId);
    return res.json({ code: 'MERCHANTS_FETCHED', message: 'Merchants fetched', merchants });
  } catch (e) {
    next(e);
  }
}

async function upsert(req, res, next) {
  try {
    const merchant = await merchantService.upsert(req.userId, req.body);
    return res.status(200).json({ code: 'MERCHANT_SAVED', message: 'Merchant mapping saved', merchant });
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const result = await merchantService.delete(req.userId, req.params.name);
    return res.json({ code: 'MERCHANT_DELETED', message: 'Merchant mapping deleted', ...result });
  } catch (e) {
    next(e);
  }
}

module.exports = { lookup, list, upsert, delete: remove };
