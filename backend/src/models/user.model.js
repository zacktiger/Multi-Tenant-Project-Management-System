const { query } = require('../config/db');

const SAFE_USER_FIELDS = 'id, name, email, avatar_url, is_verified, created_at, updated_at';

async function createUser({ name, email, passwordHash }) {
  const result = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${SAFE_USER_FIELDS}`,
    [name, email, passwordHash]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, name, email, password_hash, avatar_url, is_verified, created_at, updated_at
     FROM users WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await query(
    `SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateUser(id, fields) {
  const allowed = ['name', 'email', 'avatar_url', 'is_verified'];
  const entries = Object.entries(fields).filter(([key]) => allowed.includes(key));

  if (entries.length === 0) return findUserById(id);

  const setClauses = entries.map(([key], i) => `${key} = $${i + 2}`);
  const values = entries.map(([, val]) => val);

  const result = await query(
    `UPDATE users
     SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $1
     RETURNING ${SAFE_USER_FIELDS}`,
    [id, ...values]
  );
  return result.rows[0] || null;
}

module.exports = { createUser, findUserByEmail, findUserById, updateUser };
