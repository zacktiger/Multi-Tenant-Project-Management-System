const crypto = require('crypto');
const shareModel = require('../models/share.model');
const projectModel = require('../models/project.model');
const { recordActivity } = require('./activity.service');
const { notFound, badRequest } = require('../utils/AppError');

const MAX_EXPIRY_DAYS = 365;
/** 32 random bytes → a 64-character hex token. */
const TOKEN_BYTES = 32;

function isExpired(link) {
  return !!link.expires_at && new Date(link.expires_at) < new Date();
}

/**
 * The admin-facing view of a share link. This is the only shape that includes
 * the raw token, and it is only ever returned to an admin of the owning
 * organization — the public board endpoint never echoes it back.
 */
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
    throw notFound('Project not found', 'PROJECT_NOT_FOUND');
  }
  return project;
}

/**
 * Turns the caller's `expiresInDays` into a concrete timestamp.
 * Returns null for "never expires", which is what omitting the field means.
 */
function resolveExpiry(expiresInDays) {
  if (expiresInDays === undefined || expiresInDays === null) {
    return null;
  }

  const days = parseInt(expiresInDays, 10);
  if (Number.isNaN(days) || days < 1 || days > MAX_EXPIRY_DAYS) {
    throw badRequest(`Expiry must be between 1 and ${MAX_EXPIRY_DAYS} days`, 'INVALID_EXPIRY');
  }

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function getShareLink({ projectId, orgId }) {
  await verifyProject(projectId, orgId);

  const link = await shareModel.findActiveShareLinkByProject(projectId, orgId);
  // An expired link is reported as "no link" rather than as an error: from the
  // admin's point of view there is simply nothing active to show.
  if (!link || isExpired(link)) {
    return { shareLink: null };
  }

  return { shareLink: toAdminShape(link) };
}

async function createShareLink({ projectId, orgId, userId, expiresInDays }) {
  const project = await verifyProject(projectId, orgId);
  const expiresAt = resolveExpiry(expiresInDays);

  /*
   * crypto.randomBytes, not Math.random. This token is the *only* thing
   * standing between the public internet and this board, so it has to be
   * unguessable. Math.random is seeded pseudo-randomness whose future output
   * can be derived from past output — using it here would be a real hole.
   */
  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');

  const link = await shareModel.createShareLink({
    projectId,
    organizationId: orgId,
    token,
    createdBy: userId,
    expiresAt,
  });

  recordActivity({
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
    throw notFound('No active share link for this project', 'SHARE_LINK_NOT_FOUND');
  }

  recordActivity({
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

/**
 * Returns a scrubbed, read-only snapshot of one project board for a visitor
 * holding a share token and nothing else.
 *
 * Three separate ways a link stops working, each with its own code so the UI
 * can explain what happened. All three answer 404: to an unauthenticated
 * visitor, "revoked" and "never existed" should be equally uninformative about
 * whether the underlying project is real.
 */
async function getPublicBoard(token) {
  const link = await shareModel.findShareLinkByToken(token);

  if (!link) {
    throw notFound('This shared board is no longer available', 'SHARE_LINK_NOT_FOUND');
  }
  if (link.revoked_at) {
    throw notFound('This share link has been revoked', 'SHARE_LINK_REVOKED');
  }
  if (isExpired(link)) {
    throw notFound('This share link has expired', 'SHARE_LINK_EXPIRED');
  }

  // Independent queries, so run them together rather than one after the other.
  const [tasks, assignees] = await Promise.all([
    shareModel.getSharedTasks(link.project_id),
    shareModel.getSharedAssignees(link.project_id),
  ]);

  // Deliberately narrow: names and task content only. No emails, no user IDs,
  // no organization internals beyond the display name.
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
