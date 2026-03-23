const { query } = require('../config/db');

async function createRefreshToken({ userId, tokenHash, expiresAt }) {
  const result = await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0];
}

async function findTokenByHash(tokenHash) {
  const result = await query(
    `SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
     FROM refresh_tokens
     WHERE token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function revokeTokenById(id) {
  const result = await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
}

async function revokeAllUserTokens(userId) {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

module.exports = { createRefreshToken, findTokenByHash, revokeTokenById, revokeAllUserTokens };
