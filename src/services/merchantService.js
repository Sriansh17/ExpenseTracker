const merchantQueries = require('../queries/merchantQueries');
const categoryQueries = require('../queries/categoryQueries');
const AppError = require('../utils/appError');

/**
 * Look up category for a merchant name.
 * Returns the category mapping or null if not found.
 */
async function lookup(userId, merchantName) {
  if (!merchantName || merchantName.trim().length === 0) {
    return null;
  }
  const merchant = await merchantQueries.findByName(userId, merchantName.trim());
  return merchant;
}

/**
 * List all merchant → category mappings for a user.
 */
async function list(userId) {
  const merchants = await merchantQueries.listForUser(userId);
  return merchants;
}

/**
 * Create or update a merchant → category mapping for a user.
 */
async function upsert(userId, { name, categoryId }) {
  if (!name || name.trim().length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Merchant name is required', 400);
  }
  if (name.trim().length > 200) {
    throw new AppError('VALIDATION_ERROR', 'Merchant name must not exceed 200 characters', 400);
  }

  // Validate category exists and belongs to user or is default
  const category = await categoryQueries.findById(categoryId);
  if (!category) {
    throw new AppError('NOT_FOUND', 'Category not found', 404);
  }
  if (category.user_id !== null && category.user_id !== userId) {
    throw new AppError('NOT_FOUND', 'Category not found', 404);
  }

  const merchant = await merchantQueries.upsert(userId, name.trim(), categoryId);
  return merchant;
}

/**
 * Delete a user-specific merchant mapping.
 */
async function remove(userId, merchantName) {
  const deleted = await merchantQueries.deleteByName(userId, merchantName);
  if (!deleted) {
    throw new AppError('NOT_FOUND', 'Merchant mapping not found', 404);
  }
  return { name: merchantName };
}

module.exports = { lookup, list, upsert, delete: remove };
