const db = require('../config/db');

const create = async (userId, tokenHash, expiresAt) => (await db.query(
  `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING *`,
  [userId, tokenHash, expiresAt])).rows[0];
const findByHash = async (tokenHash) => (await db.query(
  `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND is_invalidated = FALSE AND expires_at > NOW()`, [tokenHash])).rows[0] || null;
const invalidate = async (id) => db.query('UPDATE refresh_tokens SET is_invalidated = TRUE WHERE id = $1', [id]);
const invalidateAllForUser = async (userId) => db.query('UPDATE refresh_tokens SET is_invalidated = TRUE WHERE user_id = $1', [userId]);

module.exports = { create, findByHash, invalidate, invalidateAllForUser };
