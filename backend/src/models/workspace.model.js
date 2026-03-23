const { query } = require('../config/db');

async function createWorkspace({ organizationId, name, createdBy }) {
  const result = await query(
    `INSERT INTO workspaces (organization_id, name, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [organizationId, name, createdBy]
  );
  return result.rows[0];
}

async function getWorkspacesByOrg(orgId) {
  const result = await query(
    `SELECT * FROM workspaces
     WHERE organization_id = $1
     ORDER BY created_at ASC`,
    [orgId]
  );
  return result.rows;
}

async function findWorkspaceById(workspaceId) {
  const result = await query(
    `SELECT * FROM workspaces WHERE id = $1`,
    [workspaceId]
  );
  return result.rows[0] || null;
}

async function findWorkspaceByIdAndOrg(workspaceId, orgId) {
  const result = await query(
    `SELECT * FROM workspaces
     WHERE id = $1 AND organization_id = $2`,
    [workspaceId, orgId]
  );
  return result.rows[0] || null;
}

async function updateWorkspace(workspaceId, orgId, { name }) {
  const result = await query(
    `UPDATE workspaces SET name = $1, updated_at = NOW()
     WHERE id = $2 AND organization_id = $3
     RETURNING *`,
    [name, workspaceId, orgId]
  );
  return result.rows[0] || null;
}

async function deleteWorkspace(workspaceId, orgId) {
  await query(
    `DELETE FROM workspaces
     WHERE id = $1 AND organization_id = $2`,
    [workspaceId, orgId]
  );
}

module.exports = {
  createWorkspace,
  getWorkspacesByOrg,
  findWorkspaceById,
  findWorkspaceByIdAndOrg,
  updateWorkspace,
  deleteWorkspace,
};
