const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');

const router = Router();

// Note: this whole router is mounted behind a rate limiter in server.js
// (10 requests / 15 min per IP), because these are the endpoints worth
// brute-forcing.

router.post(
  '/signup',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('orgName').trim().isLength({ min: 2 }).withMessage('Organization name must be at least 2 characters'),
  ],
  validate,
  authController.signup
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  validate,
  authController.refresh
);

router.post(
  '/logout',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ],
  validate,
  authController.logout
);

// ─── SESSION ──────────────────────────────────────────────

router.get('/me', authenticate, authController.getMe);

// Switching org reissues tokens, because the active org is baked into the JWT.
router.post('/switch/:orgId', authenticate, authController.switchOrganization);

// ─── INVITATIONS ──────────────────────────────────────────
// Both routes are intentionally unauthenticated: the invitee may not have an
// account yet. The random token in the URL is the credential.

router.get('/invitations/:token', authController.getInvitation);

router.post(
  '/invitations/:token/accept',
  [
    // Optional because an existing user accepting an invite doesn't resend
    // their name or password — only a brand-new account needs them, and the
    // service enforces that (CREDENTIALS_REQUIRED).
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  authController.acceptInvitation
);

module.exports = router;
