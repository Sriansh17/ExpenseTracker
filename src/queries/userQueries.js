const db = require('../config/db');

const findByEmail = async (email) => (await db.query(
  'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email])).rows[0] || null;
const findByGoogleSub = async (googleSub) => (await db.query(
  'SELECT * FROM users WHERE google_sub = $1 LIMIT 1', [googleSub])).rows[0] || null;
const findById = async (userId) => (await db.query(
  'SELECT * FROM users WHERE id = $1 LIMIT 1', [userId])).rows[0] || null;
const create = async ({ email, passwordHash, googleSub, displayName, avatarUrl, currency = 'USD' }) => {
  const result = await db.query(
    `INSERT INTO users (email, password_hash, google_sub, display_name, avatar_url, currency)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [email.toLowerCase(), passwordHash || null, googleSub || null, displayName || null, avatarUrl || null, currency]
  );
  return result.rows[0];
};
const updatePassword = async (userId, passwordHash) => (await db.query(
  'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1 RETURNING *', [userId, passwordHash])).rows[0];
const scheduleDelete = async (userId, date) => (await db.query(
  'UPDATE users SET deletion_scheduled_at = $2, updated_at = NOW() WHERE id = $1 RETURNING *', [userId, date])).rows[0];
const cancelDelete = async (userId) => (await db.query(
  'UPDATE users SET deletion_scheduled_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *', [userId])).rows[0];

module.exports = { findByEmail, findByGoogleSub, findById, create, updatePassword, scheduleDelete, cancelDelete };
