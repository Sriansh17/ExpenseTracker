const queries = require('../queries/incomeQueries');
const { buildPagination } = require('../utils/paginationBuilder');
const AppError = require('../utils/appError');
async function create(userId, data) { const income = await queries.create(userId, data); await queries.insertTags(income.id, data.tags); return { income: await queries.findById(userId, income.id) }; }
async function getById(userId, id) { const income = await queries.findById(userId, id); if (!income) throw new AppError('NOT_FOUND', 'Income not found', 404); return { income }; }
async function list(userId, filters) { const result = await queries.list(userId, filters); return { incomes: result.rows, pagination: buildPagination(result.totalCount, filters.page, filters.pageSize) }; }
async function update(userId, id, data) { if (!(await queries.findById(userId, id))) throw new AppError('NOT_FOUND', 'Income not found', 404); await queries.update(userId, id, data); if (data.tags) { await queries.deleteTagsByIncomeId(id); await queries.insertTags(id, data.tags); } return { income: await queries.findById(userId, id) }; }
async function remove(userId, id) { if (!(await queries.softDelete(userId, id))) throw new AppError('NOT_FOUND', 'Income not found', 404); return { deleted: true }; }
module.exports = { create, getById, list, update, delete: remove };
