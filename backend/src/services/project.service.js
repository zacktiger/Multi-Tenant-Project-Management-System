const projectModel = require('../models/project.model');
const workspaceModel = require('../models/workspace.model');
const { recordActivity } = require('./activity.service');
const { notFound, conflict } = require('../utils/AppError');

/** Postgres raises this SQLSTATE when a UNIQUE index is violated. */
const PG_UNIQUE_VIOLATION = '23505';

/** Confirms the workspace exists and belongs to the caller's organization. */
async function verifyWorkspaceOrg(workspaceId, orgId) {
  const workspace = await workspaceModel.findWorkspaceByIdAndOrg(workspaceId, orgId);
  if (!workspace) {
    throw notFound('Workspace not found', 'WORKSPACE_NOT_FOUND');
  }
  return workspace;
}

/** Confirms the project exists and belongs to the caller's organization. */
async function requireProject(projectId, orgId) {
  const project = await projectModel.findProjectByIdAndOrg(projectId, orgId);
  if (!project) {
    throw notFound('Project not found', 'PROJECT_NOT_FOUND');
  }
  return project;
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
    /*
     * Uniqueness is enforced by a partial index in the database rather than by
     * a "does this name exist?" query up front. That is deliberate: a check
     * followed by an insert has a race window where two concurrent requests
     * both pass the check. Letting the database reject the duplicate and
     * translating its error here is the only version that is actually safe.
     */
    if (err.code === PG_UNIQUE_VIOLATION) {
      throw conflict(
        'A project with this name already exists in this workspace',
        'PROJECT_NAME_TAKEN'
      );
    }
    throw err;
  }

  recordActivity({
    organizationId: orgId,
    userId,
    action: 'project.created',
    entityType: 'project',
    entityId: project.id,
    metadata: { projectName: name },
  });

  return project;
}

async function getProject({ projectId, orgId }) {
  return requireProject(projectId, orgId);
}

async function updateProject({ projectId, orgId, userId, fields }) {
  await requireProject(projectId, orgId);

  const updated = await projectModel.updateProject(projectId, orgId, fields);

  recordActivity({
    organizationId: orgId,
    userId,
    action: 'project.updated',
    entityType: 'project',
    entityId: projectId,
    metadata: { updatedFields: Object.keys(fields) },
  });

  return updated;
}

async function deleteProject({ projectId, orgId, userId }) {
  // Read first: the name is needed for the activity entry after it's archived.
  const existing = await requireProject(projectId, orgId);

  // Soft delete — sets deleted_at rather than removing the row, so the archive
  // stays recoverable and the activity log keeps a valid entity reference.
  await projectModel.softDeleteProject(projectId, orgId);

  recordActivity({
    organizationId: orgId,
    userId,
    action: 'project.archived',
    entityType: 'project',
    entityId: projectId,
    metadata: { projectName: existing.name },
  });

  return { success: true };
}

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject };
