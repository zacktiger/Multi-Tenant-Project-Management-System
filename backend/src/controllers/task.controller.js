const { validationResult } = require('express-validator');
const taskService = require('../services/task.service');
const { success, created, badRequest } = require('../utils/response');

async function getTasks(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const data = await taskService.getTasks({
      projectId: req.params.projectId,
      orgId: req.orgMember.organizationId,
      status: req.query.status,
      priority: req.query.priority,
      assignedTo: req.query.assigned_to,
      page,
      limit,
    });
    return success(res, data, 'Tasks');
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const task = await taskService.createTask({
      projectId: req.params.projectId,
      orgId: req.orgMember.organizationId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      assignedTo: req.body.assignedTo,
      dueDate: req.body.dueDate,
      userId: req.user.userId,
    });
    return created(res, task, 'Task created');
  } catch (err) {
    next(err);
  }
}

async function getTask(req, res, next) {
  try {
    const task = await taskService.getTask({
      taskId: req.params.taskId,
      orgId: req.orgMember.organizationId,
    });
    return success(res, task, 'Task details');
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const { title, description, priority, assigned_to, due_date } = req.body;
    const fields = {};
    if (title !== undefined) fields.title = title;
    if (description !== undefined) fields.description = description;
    if (priority !== undefined) fields.priority = priority;
    if (assigned_to !== undefined) fields.assigned_to = assigned_to;
    if (due_date !== undefined) fields.due_date = due_date;

    if (Object.keys(fields).length === 0) {
      return badRequest(res, 'At least one field is required', 'VALIDATION_ERROR');
    }

    const task = await taskService.updateTask({
      taskId: req.params.taskId,
      orgId: req.orgMember.organizationId,
      userId: req.user.userId,
      fields,
    });
    return success(res, task, 'Task updated');
  } catch (err) {
    next(err);
  }
}

async function moveTask(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const task = await taskService.moveTask({
      taskId: req.params.taskId,
      orgId: req.orgMember.organizationId,
      userId: req.user.userId,
      status: req.body.status,
      position: req.body.position,
    });
    return success(res, task, 'Task moved');
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  try {
    const data = await taskService.deleteTask({
      taskId: req.params.taskId,
      orgId: req.orgMember.organizationId,
      userId: req.user.userId,
    });
    return success(res, data, 'Task deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = { getTasks, createTask, getTask, updateTask, moveTask, deleteTask };
