const projectService = require('../services/project.service');
const asyncHandler = require('../middlewares/asyncHandler');
const parsePagination = require('../utils/pagination');
const pickDefined = require('../utils/pickDefined');
const { success, created, badRequest } = require('../utils/response');

/** Fields a PATCH /projects/:id is allowed to change. */
const PROJECT_UPDATE_FIELDS = ['name', 'description', 'status'];

const getProjects = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 10 });

  const data = await projectService.getProjects({
    workspaceId: req.params.workspaceId,
    orgId: req.orgMember.organizationId,
    page,
    limit,
  });
  return success(res, data, 'Projects');
});

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject({
    workspaceId: req.params.workspaceId,
    orgId: req.orgMember.organizationId,
    name: req.body.name,
    description: req.body.description,
    userId: req.user.userId,
  });
  return created(res, project, 'Project created');
});

const getProject = asyncHandler(async (req, res) => {
  const project = await projectService.getProject({
    projectId: req.params.projectId,
    orgId: req.orgMember.organizationId,
  });
  return success(res, project, 'Project details');
});

const updateProject = asyncHandler(async (req, res) => {
  const fields = pickDefined(req.body, PROJECT_UPDATE_FIELDS);

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
});

const deleteProject = asyncHandler(async (req, res) => {
  const data = await projectService.deleteProject({
    projectId: req.params.projectId,
    orgId: req.orgMember.organizationId,
    userId: req.user.userId,
  });
  // "Archived", not "deleted" — this is a soft delete (sets deleted_at).
  return success(res, data, 'Project archived');
});

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject };
