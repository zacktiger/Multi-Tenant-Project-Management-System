const { Router } = require('express');
const { body } = require('express-validator');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { loadOrgMembership, requireOrgRole } = require('../middlewares/rbac');
const orgController = require('../controllers/org.controller');
const activityController = require('../controllers/activity.controller');

const router = Router();

router.use(authenticate);

/*
 * Unlike the project and task routers, `loadOrgMembership` is applied per-route
 * rather than router-wide. These paths carry an explicit :orgId, and the
 * middleware verifies the caller is a member of *that specific* organization —
 * not merely of whichever org their token happens to name.
 */

// ─── MEMBERS ──────────────────────────────────────────────

router.get(
  '/:orgId/members',
  loadOrgMembership,
  orgController.getOrgMembers
);

router.post(
  '/:orgId/members/invite',
  loadOrgMembership,
  requireOrgRole('admin'),
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('role').isIn(['admin', 'member', 'viewer']).withMessage('Role must be admin, member, or viewer'),
  ],
  validate,
  orgController.inviteMember
);

// ─── WORKSPACES ───────────────────────────────────────────

router.get(
  '/:orgId/workspaces',
  loadOrgMembership,
  orgController.getWorkspaces
);

router.post(
  '/:orgId/workspaces',
  loadOrgMembership,
  requireOrgRole('admin'),
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Workspace name must be at least 2 characters'),
  ],
  validate,
  orgController.createWorkspace
);

// ─── ACTIVITY FEED ────────────────────────────────────────

router.get(
  '/:orgId/activity',
  loadOrgMembership,
  activityController.getActivity
);

module.exports = router;
