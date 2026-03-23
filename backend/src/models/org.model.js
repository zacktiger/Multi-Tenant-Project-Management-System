const { query } = require('../config/db');

async function createOrganization({ name, slug, createdBy }) {
  const result = await query(
    `INSERT INTO organizations (name, slug, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, name, slug, created_by, created_at`,
    [name, slug, createdBy]
  );
  return result.rows[0];
}

async function findOrgById(orgId) {
  const result = await query(
    `SELECT * FROM organizations WHERE id = $1`,
    [orgId]
  );
  return result.rows[0] || null;
}

async function findOrgBySlug(slug) {
  const result = await query(
    `SELECT * FROM organizations WHERE slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
}

async function findOrgsByUserId(userId) {
  const result = await query(
    `SELECT o.*, om.role
     FROM organizations o
     JOIN organization_members om ON om.organization_id = o.id
     WHERE om.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getOrgMembers(orgId) {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.avatar_url, om.role, om.joined_at
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.organization_id = $1
     ORDER BY om.joined_at ASC`,
    [orgId]
  );
  return result.rows;
}

async function findMembership(userId, orgId) {
  const result = await query(
    `SELECT * FROM organization_members
     WHERE user_id = $1 AND organization_id = $2`,
    [userId, orgId]
  );
  return result.rows[0] || null;
}

async function addOrgMember({ userId, organizationId, role }) {
  const result = await query(
    `INSERT INTO organization_members (user_id, organization_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, organization_id) DO NOTHING
     RETURNING id, user_id, organization_id, role, joined_at`,
    [userId, organizationId, role]
  );
  return result.rows[0] || null;
}

async function updateMemberRole(userId, orgId, role) {
  const result = await query(
    `UPDATE organization_members
     SET role = $1
     WHERE user_id = $2 AND organization_id = $3
     RETURNING *`,
    [role, userId, orgId]
  );
  return result.rows[0] || null;
}

async function removeMember(userId, orgId) {
  await query(
    `DELETE FROM organization_members
     WHERE user_id = $1 AND organization_id = $2`,
    [userId, orgId]
  );
}

module.exports = {
  createOrganization,
  findOrgById,
  findOrgBySlug,
  findOrgsByUserId,
  getOrgMembers,
  findMembership,
  addOrgMember,
  updateMemberRole,
  removeMember,
};
