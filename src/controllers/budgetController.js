const queries = require('../queries/budgetQueries');

async function get(req, res, next) {
  try {
    const budget = await queries.get(req.userId);
    res.json({ code: 'OK', message: 'Budget fetched', budget: { monthlyLimit: budget?.monthly_limit || 50000 } });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { monthlyLimit } = req.body;
    await queries.upsert(req.userId, monthlyLimit);
    res.json({ code: 'OK', message: 'Budget updated', budget: { monthlyLimit } });
  } catch (e) { next(e); }
}

module.exports = { get, update };
