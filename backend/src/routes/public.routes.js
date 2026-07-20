const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const shareController = require('../controllers/share.controller');

const router = Router();

// Public surface — deliberately read-only. No `authenticate`, and no mutation
// routes are registered here, so a share token can never reach a write path.
const publicBoardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT',
  },
});

router.get('/boards/:token', publicBoardLimiter, shareController.getPublicBoard);

// Terminate everything else here. Without this, an unmatched request would fall
// through to the authenticated /api routers and come back as a misleading 401.
router.use((req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} is not allowed on the public API`,
      code: 'METHOD_NOT_ALLOWED',
    });
  }
  return res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
  });
});

module.exports = router;
