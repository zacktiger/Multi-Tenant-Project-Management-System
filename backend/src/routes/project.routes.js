const { Router } = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const { loadOrgMembership, requireOrgRole } = require('../middlewares/rbac');
const projectController = require('../controllers/project.controller');

const router = Router();

router.use(authenticate);
router.use(loadOrgMembership);

// ─── WORKSPACE-SCOPED ────────────────────────────────────

router.get(
  '/workspaces/:workspaceId/projects',
  projectController.getProjects
);

router.post(
  '/workspaces/:workspaceId/projects',
  requireOrgRole('admin', 'member'),
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Project name must be at least 2 characters'),
    body('description').optional().trim(),
  ],
  projectController.createProject
);

// ─── PROJECT-SCOPED ──────────────────────────────────────

router.get(
  '/projects/:projectId',
  projectController.getProject
);

router.patch(
  '/projects/:projectId',
  requireOrgRole('admin', 'member'),
  [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('description').optional().trim(),
    body('status').optional().isIn(['active', 'archived', 'paused']).withMessage('Invalid status'),
  ],
  projectController.updateProject
);

router.delete(
  '/projects/:projectId',
  requireOrgRole('admin'),
  projectController.deleteProject
);

module.exports = router;
