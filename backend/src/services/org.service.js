const crypto = require('crypto');
const orgModel = require('../models/org.model');
const userModel = require('../models/user.model');
const workspaceModel = require('../models/workspace.model');

async function getOrgMembers(orgId) {
  return orgModel.getOrgMembers(orgId);
}

async function createInvitation({ orgId, email, role, invitedBy }) {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check if the user is already a member
  const existingUser = await userModel.findUserByEmail(normalizedEmail);
  if (existingUser) {
    const membership = await orgModel.findMembership(existingUser.id, orgId);
    if (membership) {
      const err = new Error('This person is already a member of this organization');
      err.statusCode = 409;
      err.code = 'ALREADY_MEMBER';
      throw err;
    }
  }

  // 2. Clean up old pending invites for this email + org (Resend logic)
  await orgModel.deleteOldPendingInvites(orgId, normalizedEmail);

  // 3. Create new invitation
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await orgModel.createInvitation({
    organizationId: orgId,
    email: normalizedEmail,
    role,
    token,
    invitedBy,
    expiresAt,
  });

  return invitation;
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
