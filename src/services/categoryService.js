const queries = require('../queries/categoryQueries');
const AppError = require('../utils/appError');

async function ensureUnique(userId, name, ignoreId) {
  if (!name || name.trim().length < 1 || name.trim().length > 50) throw new AppError('VALIDATION_ERROR', 'Category name must be 1-50 characters', 400);
  const existing = await queries.findByNameForUser(userId, name.trim());
  if (existing && existing.id !== ignoreId) {
    throw new AppError('VALIDATION_ERROR', 'Category name already exists', 409);
  }
}
async function list(userId) { return queries.findAllForUser(userId); }
async function create(userId, data) { await ensureUnique(userId, data.name); return queries.create({ userId, name: data.name.trim(), icon: data.icon || null, type: 'custom' }); }
async function update(userId, id, data) {
  const category = await queries.findById(id);
  if (!category) throw new AppError('NOT_FOUND', 'Category not found', 404);
  if (!category.user_id) throw new AppError('FORBIDDEN', 'Default categories cannot be edited', 403);
  if (category.user_id !== userId) throw new AppError('FORBIDDEN', 'Category does not belong to user', 403);
  await ensureUnique(userId, data.name || category.name, id);
  const updated = await queries.update(id, userId, data);
  if (!updated) throw new AppError('FORBIDDEN', 'Category does not belong to user', 403);
  return updated;
}
async function remove(userId, id) {
  const category = await queries.findById(id);
  if (!category) throw new AppError('NOT_FOUND', 'Category not found', 404);
  if (!category.user_id) throw new AppError('FORBIDDEN', 'Default categories cannot be deleted', 403);
  if (category.user_id !== userId) throw new AppError('FORBIDDEN', 'Category does not belong to user', 403);
  const other = await queries.findOtherDefault();
  if (other) await queries.reassignExpensesToOther(userId, id, other.id);
  const deleted = await (queries.deleteById || queries.delete)(id, userId);
  if (!deleted) throw new AppError('FORBIDDEN', 'Category does not belong to user', 403);
  return { id };
}

module.exports = { list, create, update, remove, delete: remove };
