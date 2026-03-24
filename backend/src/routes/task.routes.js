const { Router } = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const { loadOrgMembership, requireOrgRole } = require('../middlewares/rbac');
const taskController = require('../controllers/task.controller');

const router = Router();

router.use(authenticate);
router.use(loadOrgMembership);

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
  taskController.updateTask
);

router.patch(
  '/tasks/:taskId/move',
  requireOrgRole('admin', 'member'),
  [
    body('status').isIn(['todo', 'in_progress', 'done']).withMessage('Status must be todo, in_progress, or done'),
    body('position').isInt({ min: 0 }).withMessage('Position must be a non-negative integer'),
  ],
  taskController.moveTask
);

router.delete(
  '/tasks/:taskId',
  requireOrgRole('admin'),
  taskController.deleteTask
);

module.exports = router;
