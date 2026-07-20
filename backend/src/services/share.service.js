const crypto = require('crypto');
const shareModel = require('../models/share.model');
const projectModel = require('../models/project.model');
const { logActivity } = require('../models/activity.model');

const MAX_EXPIRY_DAYS = 365;

function fireActivity(params) {
  setImmediate(async () => {
    try {
      await logActivity(params);
    } catch (err) {
      console.error('Activity log failed:', err.message);
    }
  });
}

function notAvailableError(message, code) {
  const err = new Error(message);
  err.statusCode = 404;
  err.code = code;
  return err;
}

function isExpired(link) {
  return !!link.expires_at && new Date(link.expires_at) < new Date();
}

// The raw token is only ever handed back to the admin who owns the project
function toAdminShape(link) {
  return {
    id: link.id,
    token: link.token,
    expiresAt: link.expires_at,
    createdAt: link.created_at,
  };
}

async function verifyProject(projectId, orgId) {
  const project = await projectModel.findProjectByIdAndOrg(projectId, orgId);
  if (!project) {
    throw notAvailableError('Project not found', 'PROJECT_NOT_FOUND');
  }
  return project;
}

async function getShareLink({ projectId, orgId }) {
  await verifyProject(projectId, orgId);

  const link = await shareModel.findActiveShareLinkByProject(projectId, orgId);
  if (!link || isExpired(link)) {
    return { shareLink: null };
  }

  return { shareLink: toAdminShape(link) };
}

async function createShareLink({ projectId, orgId, userId, expiresInDays }) {
  const project = await verifyProject(projectId, orgId);

  let expiresAt = null;
  if (expiresInDays !== undefined && expiresInDays !== null) {
    const days = parseInt(expiresInDays, 10);
    if (Number.isNaN(days) || days < 1 || days > MAX_EXPIRY_DAYS) {
      const err = new Error(`Expiry must be between 1 and ${MAX_EXPIRY_DAYS} days`);
      err.statusCode = 400;
      err.code = 'INVALID_EXPIRY';
      throw err;
    }
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  const token = crypto.randomBytes(32).toString('hex');

  const link = await shareModel.createShareLink({
    projectId,
    organizationId: orgId,
    token,
    createdBy: userId,
    expiresAt,
  });

  fireActivity({
    organizationId: orgId,
    userId,
    action: 'project.shared',
    entityType: 'project',
    entityId: projectId,
    metadata: { projectName: project.name, expiresAt },
  });

  return toAdminShape(link);
}

async function revokeShareLink({ projectId, orgId, userId }) {
  const project = await verifyProject(projectId, orgId);

  const revoked = await shareModel.revokeShareLinksByProject(projectId, orgId);
  if (!revoked) {
    throw notAvailableError('No active share link for this project', 'SHARE_LINK_NOT_FOUND');
  }

  fireActivity({
    organizationId: orgId,
    userId,
    action: 'project.share_revoked',
    entityType: 'project',
    entityId: projectId,
    metadata: { projectName: project.name },
  });

  return { success: true };
}

// ─── PUBLIC (no authentication) ───────────────────────────
// Returns a scrubbed, read-only snapshot of a single project board.

async function getPublicBoard(token) {
  const link = await shareModel.findShareLinkByToken(token);

  if (!link) {
    throw notAvailableError('This shared board is no longer available', 'SHARE_LINK_NOT_FOUND');
  }
  if (link.revoked_at) {
    throw notAvailableError('This share link has been revoked', 'SHARE_LINK_REVOKED');
  }
  if (isExpired(link)) {
    throw notAvailableError('This share link has expired', 'SHARE_LINK_EXPIRED');
  }

  const [tasks, assignees] = await Promise.all([
    shareModel.getSharedTasks(link.project_id),
    shareModel.getSharedAssignees(link.project_id),
  ]);

  return {
    project: {
      id: link.project_id,
      name: link.project_name,
      description: link.project_description,
      status: link.project_status,
    },
    organization: { name: link.organization_name },
    tasks,
    assignees,
  };
}

module.exports = { getShareLink, createShareLink, revokeShareLink, getPublicBoard };
