const db = require('../config/db');

const get = async (userId) => {
  const { rows } = await db.query('SELECT monthly_limit FROM budgets WHERE user_id = $1', [userId]);
  return rows[0] || null;
};

const upsert = async (userId, limit) => {
  const { rows } = await db.query(
    'INSERT INTO budgets (user_id, monthly_limit) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET monthly_limit = $2, updated_at = NOW() RETURNING *',
    [userId, limit]
  );
  return rows[0];
};

module.exports = { get, upsert };
