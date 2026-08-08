const queries = require('../queries/expenseQueries');
const categoryQueries = require('../queries/categoryQueries');
const { buildPagination } = require('../utils/paginationBuilder');
const AppError = require('../utils/appError');

async function verifyCategory(userId, categoryId) {
  const category = await categoryQueries.findById(categoryId);
  if (!category || (category.user_id && category.user_id !== userId)) {
    throw new AppError('INVALID_CATEGORY', 'Category does not belong to user', 400);
  }
}

async function create(userId, data) {
  await verifyCategory(userId, data.categoryId);

  // Server-side deduplication: prevent duplicate (amount, date, user) entries
  const { rows: existing } = await require('../config/db').query(
    `SELECT id FROM expenses WHERE user_id = $1 AND amount = $2 AND expense_date = $3 AND deleted_at IS NULL LIMIT 1`,
    [userId, data.amount, data.date]
  );
  if (existing.length > 0) {
    // Already exists — return existing instead of creating duplicate
    return { expense: await queries.findById(userId, existing[0].id) };
  }

  const expense = await queries.create(userId, data);
  await queries.insertTags(expense.id, data.tags);
  return { expense: await queries.findById(userId, expense.id) };
}

async function getById(userId, id) {
  const expense = await queries.findById(userId, id);
  if (!expense) throw new AppError('NOT_FOUND', 'Expense not found', 404);
  return { expense };
}

async function list(userId, filters) {
  // Convert month param to startDate/endDate range
  if (filters.month && !filters.startDate && !filters.endDate) {
    const [year, month] = filters.month.split('-').map(Number);
    filters.startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    filters.endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  }
  const result = await queries.list(userId, filters);
  return {
    expenses: result.rows,
    pagination: buildPagination(result.totalCount, filters.page, filters.pageSize)
  };
}

async function update(userId, id, data) {
  const existing = await queries.findById(userId, id);
  if (!existing) throw new AppError('NOT_FOUND', 'Expense not found', 404);
  if (data.categoryId) await verifyCategory(userId, data.categoryId);
  await queries.update(userId, id, data);
  // Auto-learn: save merchant→category mapping when user changes category
  if (data.categoryId && existing.merchant) {
    const merchantQueries = require('../queries/merchantQueries');
    await merchantQueries.upsert(userId, existing.merchant, data.categoryId).catch(() => {});
  }
  if (data.tags) {
    await queries.deleteTagsByExpenseId(id);
    await queries.insertTags(id, data.tags);
  }
  return { expense: await queries.findById(userId, id) };
}

async function remove(userId, id) {
  const expense = await queries.softDelete(userId, id);
  if (!expense) throw new AppError('NOT_FOUND', 'Expense not found', 404);
  return { deleted: true };
}

module.exports = { create, getById, list, update, delete: remove };
