const service = require('../services/expenseService');

async function create(req, res, next) {
  try {
    const result = await service.create(req.userId, req.body);
    return res.status(201).json({ code: 'EXPENSE_CREATED', message: 'Expense created', ...result });
  } catch (e) { next(e); }
}

async function getById(req, res, next) {
  try {
    const result = await service.getById(req.userId, req.params.id);
    return res.json({ code: 'EXPENSE_FETCHED', message: 'Expense fetched', ...result });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const result = await service.list(req.userId, req.query);
    return res.json({ code: 'EXPENSES_FETCHED', message: 'Expenses fetched', ...result });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const result = await service.update(req.userId, req.params.id, req.body);
    return res.json({ code: 'EXPENSE_UPDATED', message: 'Expense updated', ...result });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const result = await service.delete(req.userId, req.params.id);
    return res.json({ code: 'EXPENSE_DELETED', message: 'Expense deleted', ...result });
  } catch (e) { next(e); }
}

module.exports = { create, getById, list, update, delete: remove };
