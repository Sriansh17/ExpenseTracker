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
