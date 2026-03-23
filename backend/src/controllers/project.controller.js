const { validationResult } = require('express-validator');
const projectService = require('../services/project.service');
const { success, created, badRequest } = require('../utils/response');

async function getProjects(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    const data = await projectService.getProjects({
      workspaceId: req.params.workspaceId,
      orgId: req.orgMember.organizationId,
      page,
      limit,
    });
    return success(res, data, 'Projects');
  } catch (err) {
    next(err);
  }
}

async function createProject(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const project = await projectService.createProject({
      workspaceId: req.params.workspaceId,
      orgId: req.orgMember.organizationId,
      name: req.body.name,
      description: req.body.description,
      userId: req.user.userId,
    });
    return created(res, project, 'Project created');
  } catch (err) {
    next(err);
  }
}

async function getProject(req, res, next) {
  try {
    const project = await projectService.getProject({
      projectId: req.params.projectId,
      orgId: req.orgMember.organizationId,
    });
    return success(res, project, 'Project details');
  } catch (err) {
    next(err);
  }
}

async function updateProject(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const { name, description, status } = req.body;
    const fields = {};
    if (name !== undefined) fields.name = name;
    if (description !== undefined) fields.description = description;
    if (status !== undefined) fields.status = status;

    if (Object.keys(fields).length === 0) {
      return badRequest(res, 'At least one field is required', 'VALIDATION_ERROR');
    }

    const project = await projectService.updateProject({
      projectId: req.params.projectId,
      orgId: req.orgMember.organizationId,
      userId: req.user.userId,
      fields,
    });
    return success(res, project, 'Project updated');
  } catch (err) {
    next(err);
  }
}

async function deleteProject(req, res, next) {
  try {
    const data = await projectService.deleteProject({
      projectId: req.params.projectId,
      orgId: req.orgMember.organizationId,
      userId: req.user.userId,
    });
    return success(res, data, 'Project archived');
  } catch (err) {
    next(err);
  }
}

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject };
