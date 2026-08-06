const db = require('../config/db');

const findByEmail = async (email) => (await db.query(
  'SELECT * FROM login_attempts WHERE email = LOWER($1)', [email])).rows[0] || null;
const upsert = async (email, attemptCount, lockedUntil = null) => (await db.query(
  `INSERT INTO login_attempts (email, attempt_count, locked_until) VALUES (LOWER($1), $2, $3)
   ON CONFLICT (email) DO UPDATE SET attempt_count = EXCLUDED.attempt_count, locked_until = EXCLUDED.locked_until, updated_at = NOW()
   RETURNING *`, [email, attemptCount, lockedUntil])).rows[0];
const reset = async (email) => upsert(email, 0, null);
const incrementAttempt = async (email, lockedUntil = null) => {
  const current = await findByEmail(email);
  return upsert(email, (current?.attempt_count || 0) + 1, lockedUntil);
};

module.exports = { findByEmail, upsert, reset, incrementAttempt };
