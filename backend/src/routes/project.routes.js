const { Router } = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { loadOrgMembership, requireOrgRole } = require('../middlewares/rbac');
const projectController = require('../controllers/project.controller');
const shareController = require('../controllers/share.controller');

const router = Router();

// Authenticate, then resolve the caller's org membership from the database.
// See task.routes.js for why the membership is re-read on every request.
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
  validate,
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
  validate,
  projectController.updateProject
);

router.delete(
  '/projects/:projectId',
  requireOrgRole('admin'),
  projectController.deleteProject
);

// ─── PUBLIC SHARE LINKS (admin only) ─────────────────────
// Creating and revoking a link is an admin action and lives here, behind auth.
// The board those links expose is served by public.routes.js, which has no
// authentication at all — keeping the two surfaces in separate files makes it
// hard to accidentally expose a write path to an anonymous visitor.

router.get(
  '/projects/:projectId/share',
  requireOrgRole('admin'),
  shareController.getShareLink
);

router.post(
  '/projects/:projectId/share',
  requireOrgRole('admin'),
  [
    body('expiresInDays').optional({ nullable: true })
      .isInt({ min: 1, max: 365 }).withMessage('Expiry must be between 1 and 365 days'),
  ],
  validate,
  shareController.createShareLink
);

router.delete(
  '/projects/:projectId/share',
  requireOrgRole('admin'),
  shareController.revokeShareLink
);

module.exports = router;
