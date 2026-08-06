const db = require('../config/db');

const baseSelect = `SELECT i.*, COALESCE((SELECT json_agg(it.tag ORDER BY it.tag) FROM income_tags it WHERE it.income_id = i.id), '[]') AS tags FROM incomes i`;
const findById = async (userId, id) => (await db.query(`${baseSelect} WHERE i.user_id = $1 AND i.id = $2 AND i.deleted_at IS NULL`, [userId, id])).rows[0] || null;
const create = async (userId, data) => (await db.query(
  `INSERT INTO incomes (user_id, amount, source, income_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
  [userId, data.amount, data.source, data.date, data.notes || null])).rows[0];
const insertTags = async (incomeId, tags = []) => { for (const tag of tags) await db.query('INSERT INTO income_tags (income_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING', [incomeId, tag]); };
const deleteTagsByIncomeId = async (incomeId) => db.query('DELETE FROM income_tags WHERE income_id = $1', [incomeId]);
const update = async (userId, id, data) => (await db.query(
  `UPDATE incomes SET amount = COALESCE($3, amount), source = COALESCE($4, source), income_date = COALESCE($5, income_date), notes = COALESCE($6, notes), updated_at = NOW()
   WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING *`,
  [userId, id, data.amount || null, data.source || null, data.date || null, data.notes ?? null])).rows[0] || null;
const softDelete = async (userId, id) => (await db.query('UPDATE incomes SET deleted_at = NOW() WHERE user_id = $1 AND id = $2 AND deleted_at IS NULL RETURNING *', [userId, id])).rows[0] || null;
async function list(userId, { page = 1, pageSize = 20 }) {
  const values = [userId, pageSize, (page - 1) * pageSize];
  const count = await db.query('SELECT COUNT(*)::int AS count FROM incomes WHERE user_id = $1 AND deleted_at IS NULL', [userId]);
  const rows = await db.query(`${baseSelect} WHERE i.user_id = $1 AND i.deleted_at IS NULL ORDER BY i.income_date DESC, i.created_at DESC LIMIT $2 OFFSET $3`, values);
  return { rows: rows.rows, totalCount: count.rows[0].count };
}
module.exports = { create, findById, list, update, softDelete, insertTags, deleteTagsByIncomeId };
