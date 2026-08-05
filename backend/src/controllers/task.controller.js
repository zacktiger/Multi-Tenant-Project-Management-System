const taskService = require('../services/task.service');
const asyncHandler = require('../middlewares/asyncHandler');
const parsePagination = require('../utils/pagination');
const pickDefined = require('../utils/pickDefined');
const { success, created, badRequest } = require('../utils/response');

/*
 * Controllers translate HTTP into plain JavaScript and back. They unpack the
 * request, call one service function, and format the reply — no business rules.
 *
 * Two pieces of former boilerplate now live elsewhere:
 *   - `asyncHandler` forwards thrown errors to the error handler, replacing the
 *     try/catch that ended every function here.
 *   - the `validate` middleware on each route checks express-validator results,
 *     replacing the four-line check that started every mutating function.
 */

/** Fields a PATCH /tasks/:id is allowed to change. Anything else is ignored. */
const TASK_UPDATE_FIELDS = ['title', 'description', 'priority', 'assigned_to', 'due_date'];

const getTasks = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 20 });

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
});

const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask({
    projectId: req.params.projectId,
    // orgId comes from the RBAC middleware's DB lookup, never from the client.
    orgId: req.orgMember.organizationId,
    title: req.body.title,
    description: req.body.description,
    status: req.body.status,
    priority: req.body.priority,
    assignedTo: req.body.assignedTo,
    dueDate: req.body.dueDate,
    userId: req.user.userId,
  });
  return created(res, task, 'Task created');
});

const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.getTask({
    taskId: req.params.taskId,
    orgId: req.orgMember.organizationId,
  });
  return success(res, task, 'Task details');
});

const updateTask = asyncHandler(async (req, res) => {
  const fields = pickDefined(req.body, TASK_UPDATE_FIELDS);

  // An empty PATCH is a client mistake worth reporting rather than a no-op.
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
});

const moveTask = asyncHandler(async (req, res) => {
  const task = await taskService.moveTask({
    taskId: req.params.taskId,
    orgId: req.orgMember.organizationId,
    userId: req.user.userId,
    status: req.body.status,
    position: req.body.position,
  });
  return success(res, task, 'Task moved');
});

const deleteTask = asyncHandler(async (req, res) => {
  const data = await taskService.deleteTask({
    taskId: req.params.taskId,
    orgId: req.orgMember.organizationId,
    userId: req.user.userId,
  });
  return success(res, data, 'Task deleted');
});

module.exports = { getTasks, createTask, getTask, updateTask, moveTask, deleteTask };
