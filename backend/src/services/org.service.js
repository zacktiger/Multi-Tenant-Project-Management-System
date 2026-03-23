const orgModel = require('../models/org.model');
const userModel = require('../models/user.model');
const workspaceModel = require('../models/workspace.model');

async function getOrgMembers(orgId) {
  return orgModel.getOrgMembers(orgId);
}

async function inviteMember({ orgId, email, role }) {
  const user = await userModel.findUserByEmail(email);
  if (!user) {
    const err = new Error('User not found, they must sign up first');
    err.statusCode = 404;
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  const existing = await orgModel.findMembership(user.id, orgId);
  if (existing) {
    const err = new Error('User is already a member of this organization');
    err.statusCode = 409;
    err.code = 'ALREADY_MEMBER';
    throw err;
  }

  const member = await orgModel.addOrgMember({
    userId: user.id,
    organizationId: orgId,
    role,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    joined_at: member.joined_at,
  };
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

module.exports = { getOrgMembers, inviteMember, getWorkspaces, createWorkspace };
