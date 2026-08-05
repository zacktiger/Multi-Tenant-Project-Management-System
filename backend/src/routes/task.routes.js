const { Router } = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { loadOrgMembership, requireOrgRole } = require('../middlewares/rbac');
const taskController = require('../controllers/task.controller');

const router = Router();

/*
 * Every route below runs this pair first:
 *   authenticate      — verify the JWT signature, populate req.user
 *   loadOrgMembership — look the membership up in the DB, populate req.orgMember
 *
 * The membership lookup is what makes `req.orgMember.organizationId` safe to
 * trust as the tenant boundary, and it re-reads the role on every request so a
 * demotion takes effect immediately rather than when the token expires.
 */
router.use(authenticate);
router.use(loadOrgMembership);

// Middleware order on mutating routes is deliberate:
//   requireOrgRole → body validators → validate → controller
// Authorisation is checked before input, so a caller who isn't allowed to touch
// the endpoint gets 403 rather than a critique of their payload.

// ─── PROJECT-SCOPED TASKS ────────────────────────────────

router.get(
  '/projects/:projectId/tasks',
  taskController.getTasks
);

router.post(
  '/projects/:projectId/tasks',
  requireOrgRole('admin', 'member'),
  [
    body('title').trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
    body('description').optional().trim(),
    body('status').optional().isIn(['todo', 'in_progress', 'done']).withMessage('Status must be todo, in_progress, or done'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
    body('assignedTo').optional().isUUID().withMessage('assignedTo must be a valid UUID'),
    body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
  ],
  validate,
  taskController.createTask
);

// ─── TASK-SCOPED ──────────────────────────────────────────

router.get(
  '/tasks/:taskId',
  taskController.getTask
);

router.patch(
  '/tasks/:taskId',
  requireOrgRole('admin', 'member'),
  [
    body('title').optional().trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
    body('description').optional().trim(),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    body('assigned_to').optional(),
    body('due_date').optional(),
  ],
  validate,
  taskController.updateTask
);

router.patch(
  '/tasks/:taskId/move',
  requireOrgRole('admin', 'member'),
  [
    body('status').isIn(['todo', 'in_progress', 'done']).withMessage('Status must be todo, in_progress, or done'),
    body('position').isInt({ min: 0 }).withMessage('Position must be a non-negative integer'),
  ],
  validate,
  taskController.moveTask
);

// Deleting is admin-only, unlike creating and editing.
router.delete(
  '/tasks/:taskId',
  requireOrgRole('admin'),
  taskController.deleteTask
);

module.exports = router;
