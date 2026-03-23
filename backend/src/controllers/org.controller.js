const { validationResult } = require('express-validator');
const orgService = require('../services/org.service');
const { success, created, badRequest } = require('../utils/response');

async function getOrgMembers(req, res, next) {
  try {
    const members = await orgService.getOrgMembers(req.params.orgId);
    return success(res, members, 'Organization members');
  } catch (err) {
    next(err);
  }
}

async function inviteMember(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const { email, role } = req.body;
    const member = await orgService.inviteMember({
      orgId: req.params.orgId,
      email,
      role,
    });
    return created(res, member, 'Member invited successfully');
  } catch (err) {
    next(err);
  }
}

async function getWorkspaces(req, res, next) {
  try {
    const workspaces = await orgService.getWorkspaces(req.params.orgId);
    return success(res, workspaces, 'Workspaces');
  } catch (err) {
    next(err);
  }
}

async function createWorkspace(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const workspace = await orgService.createWorkspace({
      orgId: req.params.orgId,
      name: req.body.name,
      userId: req.user.userId,
    });
    return created(res, workspace, 'Workspace created');
  } catch (err) {
    next(err);
  }
}

module.exports = { getOrgMembers, inviteMember, getWorkspaces, createWorkspace };
