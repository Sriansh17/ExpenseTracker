const pool = require('../config/db');

/**
 * Find category for a merchant by name (case-insensitive).
 * Checks user-specific mappings first, then system defaults.
 */
const findByName = async (userId, merchantName) => {
  const { rows } = await pool.query(
    `SELECT m.*, c.name AS category_name
     FROM merchants m
     JOIN categories c ON c.id = m.category_id
     WHERE LOWER(m.name) = LOWER($1)
       AND (m.user_id = $2 OR m.user_id IS NULL)
     ORDER BY m.user_id DESC NULLS LAST
     LIMIT 1`,
    [merchantName, userId]
  );
  return rows[0] || null;
};

/**
 * List all merchants for a user (user-specific + system defaults).
 */
const listForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT m.*, c.name AS category_name
     FROM merchants m
     JOIN categories c ON c.id = m.category_id
     WHERE m.user_id = $1 OR m.user_id IS NULL
     ORDER BY m.name ASC`,
    [userId]
  );
  return rows;
};

/**
 * Create or update a user-specific merchant → category mapping.
 */
const upsert = async (userId, merchantName, categoryId) => {
  const { rows } = await pool.query(
    `INSERT INTO merchants (user_id, name, category_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, LOWER(name))
     DO UPDATE SET category_id = $3
     RETURNING *`,
    [userId, merchantName, categoryId]
  );
  return rows[0];
};

/**
 * Delete a user-specific merchant mapping.
 */
const deleteByName = async (userId, merchantName) => {
  const { rowCount } = await pool.query(
    `DELETE FROM merchants WHERE user_id = $1 AND LOWER(name) = LOWER($2)`,
    [userId, merchantName]
  );
  return rowCount > 0;
};

/**
 * Seed default merchant mappings (system-wide, user_id = NULL).
 * Called once during setup. Skips if already seeded.
 */
const seedDefaults = async (defaults) => {
  for (const { name, categoryId } of defaults) {
    await pool.query(
      `INSERT INTO merchants (user_id, name, category_id)
       VALUES (NULL, $1, $2)
       ON CONFLICT DO NOTHING`,
      [name, categoryId]
    );
  }
};

module.exports = { findByName, listForUser, upsert, deleteByName, seedDefaults };
