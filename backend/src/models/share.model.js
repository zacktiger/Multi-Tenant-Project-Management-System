const { query, getClient } = require('../config/db');

async function findActiveShareLinkByProject(projectId, orgId) {
  const result = await query(
    `SELECT * FROM project_share_links
     WHERE project_id = $1 AND organization_id = $2 AND revoked_at IS NULL`,
    [projectId, orgId]
  );
  return result.rows[0] || null;
}

async function createShareLink({ projectId, organizationId, token, createdBy, expiresAt }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Only one active link per project — retire any existing one first
    await client.query(
      `UPDATE project_share_links
       SET revoked_at = NOW()
       WHERE project_id = $1 AND organization_id = $2 AND revoked_at IS NULL`,
      [projectId, organizationId]
    );

    const result = await client.query(
      `INSERT INTO project_share_links (project_id, organization_id, token, created_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [projectId, organizationId, token, createdBy, expiresAt || null]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function revokeShareLinksByProject(projectId, orgId) {
  const result = await query(
    `UPDATE project_share_links
     SET revoked_at = NOW()
     WHERE project_id = $1 AND organization_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [projectId, orgId]
  );
  return result.rows[0] || null;
}

// Public lookup — joins the project so a deleted project yields no row
async function findShareLinkByToken(token) {
  const result = await query(
    `SELECT sl.id, sl.expires_at, sl.revoked_at,
            p.id AS project_id,
            p.name AS project_name,
            p.description AS project_description,
            p.status AS project_status,
            o.name AS organization_name
     FROM project_share_links sl
     JOIN projects p ON p.id = sl.project_id AND p.deleted_at IS NULL
     JOIN organizations o ON o.id = sl.organization_id
     WHERE sl.token = $1`,
    [token]
  );
  return result.rows[0] || null;
}

async function getSharedTasks(projectId) {
  const result = await query(
    `SELECT id, project_id, title, description, status, priority, assigned_to, due_date, position
     FROM tasks
     WHERE project_id = $1 AND deleted_at IS NULL
     ORDER BY status ASC, position ASC, created_at DESC`,
    [projectId]
  );
  return result.rows;
}

// Display names only — never expose member emails on a public board
async function getSharedAssignees(projectId) {
  const result = await query(
    `SELECT DISTINCT u.id, u.name, u.avatar_url
     FROM users u
     JOIN tasks t ON t.assigned_to = u.id
     WHERE t.project_id = $1 AND t.deleted_at IS NULL`,
    [projectId]
  );
  return result.rows;
}

module.exports = {
  findActiveShareLinkByProject,
  createShareLink,
  revokeShareLinksByProject,
  findShareLinkByToken,
  getSharedTasks,
  getSharedAssignees,
};
