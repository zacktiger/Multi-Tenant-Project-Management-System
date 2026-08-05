const taskModel = require('../models/task.model');
const projectModel = require('../models/project.model');
const { recordActivity } = require('./activity.service');
const { notFound } = require('../utils/AppError');

/**
 * Confirms the project exists *and* belongs to the caller's organization.
 *
 * This is the tenant boundary check. `orgId` comes from the RBAC middleware's
 * database lookup, never from the request body, so it cannot be forged. If a
 * caller guesses a valid project UUID from another organization the query
 * matches nothing and they get a 404 — deliberately not a 403, which would
 * confirm the project exists.
 */
async function verifyProject(projectId, orgId) {
  const project = await projectModel.findProjectByIdAndOrg(projectId, orgId);
  if (!project) {
    throw notFound('Project not found', 'PROJECT_NOT_FOUND');
  }
  return project;
}

/** Same check for a single task. Every task operation starts here. */
async function requireTask(taskId, orgId) {
  const task = await taskModel.findTaskByIdAndOrg(taskId, orgId);
  if (!task) {
    throw notFound('Task not found', 'TASK_NOT_FOUND');
  }
  return task;
}

async function getTasks({ projectId, orgId, status, priority, assignedTo, page, limit }) {
  await verifyProject(projectId, orgId);
  return taskModel.getTasksByProject(projectId, orgId, { status, priority, assignedTo, page, limit });
}

async function createTask({ projectId, orgId, title, description, status, priority, assignedTo, dueDate, userId }) {
  await verifyProject(projectId, orgId);

  const task = await taskModel.createTask({
    projectId,
    organizationId: orgId,
    title,
    description,
    status,
    priority,
    assignedTo,
    createdBy: userId,
    dueDate,
  });

  recordActivity({
    organizationId: orgId,
    userId,
    action: 'task.created',
    entityType: 'task',
    entityId: task.id,
    metadata: { taskTitle: title, projectId },
  });

  return task;
}

async function getTask({ taskId, orgId }) {
  return requireTask(taskId, orgId);
}

async function updateTask({ taskId, orgId, userId, fields }) {
  const existing = await requireTask(taskId, orgId);

  const updated = await taskModel.updateTask(taskId, orgId, fields);

  // A reassignment is worth distinguishing from an ordinary edit in the feed.
  const isReassignment = fields.assigned_to && fields.assigned_to !== existing.assigned_to;

  recordActivity({
    organizationId: orgId,
    userId,
    action: isReassignment ? 'task.assigned' : 'task.updated',
    entityType: 'task',
    entityId: taskId,
    metadata: { taskTitle: existing.title, updatedFields: Object.keys(fields) },
  });

  return updated;
}

async function moveTask({ taskId, orgId, userId, status, position }) {
  // Read the task first so the activity entry can record where it came from.
  const existing = await requireTask(taskId, orgId);

  const moved = await taskModel.moveTask(taskId, orgId, { status, position });

  recordActivity({
    organizationId: orgId,
    userId,
    action: 'task.moved',
    entityType: 'task',
    entityId: taskId,
    metadata: { from: existing.status, to: status, taskTitle: existing.title },
  });

  return moved;
}

async function deleteTask({ taskId, orgId, userId }) {
  // Read before deleting — the title is gone from the caller's reach afterwards.
  const existing = await requireTask(taskId, orgId);

  await taskModel.softDeleteTask(taskId, orgId);

  recordActivity({
    organizationId: orgId,
    userId,
    action: 'task.deleted',
    entityType: 'task',
    entityId: taskId,
    metadata: { taskTitle: existing.title },
  });

  return { success: true };
}

module.exports = { getTasks, createTask, getTask, updateTask, moveTask, deleteTask };
