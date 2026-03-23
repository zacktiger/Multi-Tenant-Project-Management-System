const taskModel = require('../models/task.model');
const projectModel = require('../models/project.model');
const { logActivity } = require('../models/activity.model');

function fireActivity(params) {
  setImmediate(async () => {
    try {
      await logActivity(params);
    } catch (err) {
      console.error('Activity log failed:', err.message);
    }
  });
}

async function verifyProject(projectId, orgId) {
  const project = await projectModel.findProjectByIdAndOrg(projectId, orgId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    err.code = 'PROJECT_NOT_FOUND';
    throw err;
  }
  return project;
}

async function getTasks({ projectId, orgId, status, priority, assignedTo, page, limit }) {
  await verifyProject(projectId, orgId);
  return taskModel.getTasksByProject(projectId, orgId, { status, priority, assignedTo, page, limit });
}

async function createTask({ projectId, orgId, title, description, priority, assignedTo, dueDate, userId }) {
  await verifyProject(projectId, orgId);

  const task = await taskModel.createTask({
    projectId,
    organizationId: orgId,
    title,
    description,
    priority,
    assignedTo,
    createdBy: userId,
    dueDate,
  });

  fireActivity({
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
  const task = await taskModel.findTaskByIdAndOrg(taskId, orgId);
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    err.code = 'TASK_NOT_FOUND';
    throw err;
  }
  return task;
}

async function updateTask({ taskId, orgId, userId, fields }) {
  const existing = await taskModel.findTaskByIdAndOrg(taskId, orgId);
  if (!existing) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    err.code = 'TASK_NOT_FOUND';
    throw err;
  }

  const updated = await taskModel.updateTask(taskId, orgId, fields);

  const action = fields.assigned_to && fields.assigned_to !== existing.assigned_to
    ? 'task.assigned'
    : 'task.updated';

  fireActivity({
    organizationId: orgId,
    userId,
    action,
    entityType: 'task',
    entityId: taskId,
    metadata: { taskTitle: existing.title, updatedFields: Object.keys(fields) },
  });

  return updated;
}

async function moveTask({ taskId, orgId, userId, status, position }) {
  const existing = await taskModel.findTaskByIdAndOrg(taskId, orgId);
  if (!existing) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    err.code = 'TASK_NOT_FOUND';
    throw err;
  }

  const moved = await taskModel.moveTask(taskId, orgId, { status, position });

  fireActivity({
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
  const existing = await taskModel.findTaskByIdAndOrg(taskId, orgId);
  if (!existing) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    err.code = 'TASK_NOT_FOUND';
    throw err;
  }

  await taskModel.softDeleteTask(taskId, orgId);

  fireActivity({
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
