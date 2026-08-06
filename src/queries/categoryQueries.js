const db = require('../config/db');

const findAllForUser = async (userId) => (await db.query(
  `SELECT * FROM categories WHERE user_id IS NULL OR user_id = $1
   ORDER BY (user_id IS NOT NULL), LOWER(name)`, [userId])).rows;
const findById = async (id) => (await db.query('SELECT * FROM categories WHERE id = $1', [id])).rows[0] || null;
const findByNameForUser = async (userId, name) => (await db.query(
  `SELECT * FROM categories WHERE (user_id IS NULL OR user_id = $1) AND LOWER(name) = LOWER($2) LIMIT 1`, [userId, name])).rows[0] || null;
const findOtherDefault = async () => (await db.query(
  `SELECT * FROM categories WHERE user_id IS NULL AND LOWER(name) = 'other' LIMIT 1`)).rows[0] || null;
const create = async (input, data) => {
  const value = data ? { userId: input, ...data } : input;
  return (await db.query(`INSERT INTO categories (user_id, name, icon, type) VALUES ($1, $2, $3, $4) RETURNING *`,
    [value.userId, value.name.trim(), value.icon || null, value.type === 'income' ? 'income' : 'expense'])).rows[0];
};
const update = async (id, userId, { name, icon }) => (await db.query(
  `UPDATE categories SET name = COALESCE($3, name), icon = COALESCE($4, icon)
   WHERE id = $1 AND user_id = $2 RETURNING *`, [id, userId, name?.trim() || null, icon])).rows[0] || null;
const deleteCategory = async (id, userId) => (await db.query(
  'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId])).rows[0] || null;
const reassignExpensesToOther = async (userId, categoryId, otherId) => db.query(
  `UPDATE expenses SET category_id = $3 WHERE category_id = $2 AND user_id = $1 AND deleted_at IS NULL`, [userId, categoryId, otherId]);
const deleteById = async (id, userId) => (await db.query(
  'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId])).rows[0] || null;

module.exports = { findAllForUser, findById, findByNameForUser, findOtherDefault, create, update, delete: deleteCategory, deleteById, reassignExpensesToOther };
