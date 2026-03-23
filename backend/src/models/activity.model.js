const { query } = require('../config/db');

async function logActivity({ organizationId, userId, action, entityType, entityId, metadata }) {
  const result = await query(
    `INSERT INTO activity_logs (organization_id, user_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [organizationId, userId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null]
  );
  return result.rows[0];
}

async function getActivityByOrg(orgId, { page = 1, limit = 30 } = {}) {
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT al.*, u.name AS user_name, u.avatar_url AS user_avatar
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.organization_id = $1
       ORDER BY al.created_at DESC
       LIMIT $2 OFFSET $3`,
      [orgId, limit, offset]
    ),
    query(
      `SELECT COUNT(*)::int AS total FROM activity_logs WHERE organization_id = $1`,
      [orgId]
    ),
  ]);

  return {
    activities: dataResult.rows,
    total: countResult.rows[0].total,
    page,
    limit,
  };
}

module.exports = { logActivity, getActivityByOrg };
