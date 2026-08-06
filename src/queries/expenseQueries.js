const db = require('../config/db');

const baseSelect = `SELECT e.*, c.name AS category_name,
  COALESCE((SELECT json_agg(et.tag ORDER BY et.tag) FROM expense_tags et WHERE et.expense_id = e.id), '[]') AS tags
  FROM expenses e JOIN categories c ON c.id = e.category_id`;
const findById = async (userId, id) => (await db.query(
  `${baseSelect} WHERE e.user_id = $1 AND e.id = $2 AND e.deleted_at IS NULL`, [userId, id])).rows[0] || null;
const create = async (userId, data) => (await db.query(
  `INSERT INTO expenses (user_id, category_id, amount, expense_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
  [userId, data.categoryId, data.amount, data.date, data.notes || null])).rows[0];
const insertTags = async (expenseId, tags = []) => {
  for (const tag of tags) await db.query('INSERT INTO expense_tags (expense_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING', [expenseId, tag]);
};
const deleteTagsByExpenseId = async (expenseId) => db.query('DELETE FROM expense_tags WHERE expense_id = $1', [expenseId]);
const update = async (userId, id, data) => (await db.query(
  `UPDATE expenses SET category_id = COALESCE($3, category_id), amount = COALESCE($4, amount),
   expense_date = COALESCE($5, expense_date), notes = COALESCE($6, notes), updated_at = NOW()
   WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING *`,
  [userId, id, data.categoryId || null, data.amount || null, data.date || null, data.notes ?? null])).rows[0] || null;
const softDelete = async (userId, id) => (await db.query(
  `UPDATE expenses SET deleted_at = NOW() WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING *`, [userId, id])).rows[0] || null;
const attachReceipt = async (userId, id, receiptUrl) => (await db.query(
  `UPDATE expenses SET receipt_url = $3, updated_at = NOW() WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL AND receipt_url IS NULL RETURNING *`, [userId, id, receiptUrl])).rows[0] || null;

async function list(userId, filters) {
  const values = [userId]; const where = ['e.user_id = $1', 'e.deleted_at IS NULL'];
  const add = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };
  if (filters.category) add('e.category_id = ?', filters.category);
  if (filters.startDate) add('e.expense_date >= ?', filters.startDate);
  if (filters.endDate) add('e.expense_date <= ?', filters.endDate);
  if (filters.minAmount !== undefined) add('e.amount >= ?', filters.minAmount);
  if (filters.maxAmount !== undefined) add('e.amount <= ?', filters.maxAmount);
  if (filters.search) { values.push(`%${filters.search}%`); const n = `$${values.length}`; where.push(`(e.notes ILIKE ${n} OR EXISTS (SELECT 1 FROM expense_tags st WHERE st.expense_id = e.id AND st.tag ILIKE ${n}))`); }
  if (filters.tags?.length) { values.push(filters.tags); where.push(`EXISTS (SELECT 1 FROM expense_tags ft WHERE ft.expense_id = e.id AND ft.tag = ANY($${values.length}))`); }
  const count = await db.query(`SELECT COUNT(*)::int AS count FROM expenses e WHERE ${where.join(' AND ')}`, values);
  const page = filters.page || 1; const pageSize = filters.pageSize || 20; values.push(pageSize, (page - 1) * pageSize);
  const rows = await db.query(`${baseSelect} WHERE ${where.join(' AND ')} ORDER BY e.expense_date DESC, e.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return { rows: rows.rows, totalCount: count.rows[0].count };
}

module.exports = { create, findById, list, update, softDelete, attachReceipt, insertTags, deleteTagsByExpenseId };
