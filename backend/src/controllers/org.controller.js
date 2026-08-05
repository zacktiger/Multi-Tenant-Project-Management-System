const orgService = require('../services/org.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created } = require('../utils/response');

const getOrgMembers = asyncHandler(async (req, res) => {
  const members = await orgService.getOrgMembers(req.params.orgId);
  return success(res, members, 'Organization members');
});

const inviteMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const invitation = await orgService.createInvitation({
    orgId: req.params.orgId,
    email,
    role,
    invitedBy: req.user.userId,
  });
  return created(res, invitation, 'Member invited successfully');
});

const getWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await orgService.getWorkspaces(req.params.orgId);
  return success(res, workspaces, 'Workspaces');
});

const createWorkspace = asyncHandler(async (req, res) => {
  const workspace = await orgService.createWorkspace({
    orgId: req.params.orgId,
    name: req.body.name,
    userId: req.user.userId,
  });
  return created(res, workspace, 'Workspace created');
});

module.exports = { getOrgMembers, inviteMember, getWorkspaces, createWorkspace };
