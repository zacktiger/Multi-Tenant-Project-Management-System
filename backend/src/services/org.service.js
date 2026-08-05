const crypto = require('crypto');
const orgModel = require('../models/org.model');
const userModel = require('../models/user.model');
const workspaceModel = require('../models/workspace.model');
const { conflict } = require('../utils/AppError');

const INVITE_TOKEN_BYTES = 32;
const INVITE_VALID_DAYS = 7;

async function getOrgMembers(orgId) {
  return orgModel.getOrgMembers(orgId);
}

async function createInvitation({ orgId, email, role, invitedBy }) {
  // Emails are compared case-insensitively throughout, so normalise once here
  // and store the normalised form. The matching unique index uses LOWER(email).
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Reject if this person is already in the organization.
  const existingUser = await userModel.findUserByEmail(normalizedEmail);
  if (existingUser) {
    const membership = await orgModel.findMembership(existingUser.id, orgId);
    if (membership) {
      throw conflict('This person is already a member of this organization', 'ALREADY_MEMBER');
    }
  }

  // 2. Drop any earlier pending invite for this address. A partial unique index
  //    allows only one un-accepted invite per (org, email), so re-inviting
  //    someone has to clear the old row first. This is the "resend" path.
  await orgModel.deleteOldPendingInvites(orgId, normalizedEmail);

  // 3. Issue a fresh invitation. Same reasoning as share tokens: the token is
  //    the only credential in the invite link, so it must be unguessable.
  const token = crypto.randomBytes(INVITE_TOKEN_BYTES).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_VALID_DAYS);

  return orgModel.createInvitation({
    organizationId: orgId,
    email: normalizedEmail,
    role,
    token,
    invitedBy,
    expiresAt,
  });
}

async function getWorkspaces(orgId) {
  return workspaceModel.getWorkspacesByOrg(orgId);
}

async function createWorkspace({ orgId, name, userId }) {
  return workspaceModel.createWorkspace({
    organizationId: orgId,
    name,
    createdBy: userId,
  });
}

module.exports = { getOrgMembers, createInvitation, getWorkspaces, createWorkspace };
