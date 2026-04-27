const { query } = require('../config/db');

function buildUpdateFields(fields) {
  const allowed = ['name', 'description', 'status'];
  const entries = Object.entries(fields).filter(
    ([key, val]) => allowed.includes(key) && val !== undefined
  );
  if (entries.length === 0) return null;

  const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values = entries.map(([, val]) => val);
  return { setClause: setClauses.join(', '), values };
}

async function createProject({ workspaceId, organizationId, name, description, createdBy }) {
  const result = await query(
    `INSERT INTO projects (workspace_id, organization_id, name, description, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [workspaceId, organizationId, name, description || null, createdBy]
  );
  return result.rows[0];
}

async function getProjectsByWorkspace(workspaceId, orgId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT * FROM projects
       WHERE workspace_id = $1
       AND organization_id = $2
       AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [workspaceId, orgId, limit, offset]
    ),
    query(
      `SELECT COUNT(*)::int AS total FROM projects
       WHERE workspace_id = $1
       AND organization_id = $2
       AND deleted_at IS NULL`,
      [workspaceId, orgId]
    ),
  ]);

  return {
    projects: dataResult.rows,
    total: countResult.rows[0].total,
    page,
    limit,
  };
}

async function findProjectById(projectId) {
  const result = await query(
    `SELECT * FROM projects
     WHERE id = $1
     AND deleted_at IS NULL`,
    [projectId]
  );
  return result.rows[0] || null;
}

async function findProjectByIdAndOrg(projectId, orgId) {
  const result = await query(
    `SELECT * FROM projects
     WHERE id = $1
     AND organization_id = $2
     AND deleted_at IS NULL`,
    [projectId, orgId]
  );
  return result.rows[0] || null;
}

async function updateProject(projectId, orgId, fields) {
  const update = buildUpdateFields(fields);
  if (!update) return findProjectByIdAndOrg(projectId, orgId);

  const paramOffset = update.values.length;
  const result = await query(
    `UPDATE projects
     SET ${update.setClause}, updated_at = NOW()
     WHERE id = $${paramOffset + 1}
     AND organization_id = $${paramOffset + 2}
     AND deleted_at IS NULL
     RETURNING *`,
    [...update.values, projectId, orgId]
  );
  return result.rows[0] || null;
}

async function softDeleteProject(projectId, orgId) {
  const result = await query(
    `UPDATE projects
     SET deleted_at = NOW()
     WHERE id = $1
     AND organization_id = $2
     AND deleted_at IS NULL
     RETURNING id`,
    [projectId, orgId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createProject,
  getProjectsByWorkspace,
  findProjectById,
  findProjectByIdAndOrg,
  updateProject,
  softDeleteProject,
};
