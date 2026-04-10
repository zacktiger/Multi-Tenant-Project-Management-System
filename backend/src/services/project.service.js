const projectModel = require('../models/project.model');
const workspaceModel = require('../models/workspace.model');
const { logActivity } = require('../models/activity.model');

async function verifyWorkspaceOrg(workspaceId, orgId) {
  const workspace = await workspaceModel.findWorkspaceByIdAndOrg(workspaceId, orgId);
  if (!workspace) {
    const err = new Error('Workspace not found');
    err.statusCode = 404;
    err.code = 'WORKSPACE_NOT_FOUND';
    throw err;
  }
  return workspace;
}

async function getProjects({ workspaceId, orgId, page, limit }) {
  await verifyWorkspaceOrg(workspaceId, orgId);
  return projectModel.getProjectsByWorkspace(workspaceId, orgId, { page, limit });
}

async function createProject({ workspaceId, orgId, name, description, userId }) {
  await verifyWorkspaceOrg(workspaceId, orgId);

  let project;
  try {
    project = await projectModel.createProject({
      workspaceId,
      organizationId: orgId,
      name,
      description,
      createdBy: userId,
    });
  } catch (err) {
    if (err.code === '23505') {
      const dupErr = new Error('A project with this name already exists in this workspace');
      dupErr.statusCode = 409;
      dupErr.code = 'PROJECT_NAME_TAKEN';
      throw dupErr;
    }
    throw err;
  }

  setImmediate(async () => {
    try {
      await logActivity({
        organizationId: orgId,
        userId,
        action: 'project.created',
        entityType: 'project',
        entityId: project.id,
        metadata: { projectName: name },
      });
    } catch (err) {
      console.error('Activity log failed:', err.message);
    }
  });

  return project;
}

async function getProject({ projectId, orgId }) {
  const project = await projectModel.findProjectByIdAndOrg(projectId, orgId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    err.code = 'PROJECT_NOT_FOUND';
    throw err;
  }
  return project;
}

async function updateProject({ projectId, orgId, userId, fields }) {
  const existing = await projectModel.findProjectByIdAndOrg(projectId, orgId);
  if (!existing) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    err.code = 'PROJECT_NOT_FOUND';
    throw err;
  }

  const updated = await projectModel.updateProject(projectId, orgId, fields);

  setImmediate(async () => {
    try {
      await logActivity({
        organizationId: orgId,
        userId,
        action: 'project.updated',
        entityType: 'project',
        entityId: projectId,
        metadata: { updatedFields: Object.keys(fields) },
      });
    } catch (err) {
      console.error('Activity log failed:', err.message);
    }
  });

  return updated;
}

async function deleteProject({ projectId, orgId, userId }) {
  const existing = await projectModel.findProjectByIdAndOrg(projectId, orgId);
  if (!existing) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    err.code = 'PROJECT_NOT_FOUND';
    throw err;
  }

  await projectModel.softDeleteProject(projectId, orgId);

  setImmediate(async () => {
    try {
      await logActivity({
        organizationId: orgId,
        userId,
        action: 'project.archived',
        entityType: 'project',
        entityId: projectId,
        metadata: { projectName: existing.name },
      });
    } catch (err) {
      console.error('Activity log failed:', err.message);
    }
  });

  return { success: true };
}

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject };
