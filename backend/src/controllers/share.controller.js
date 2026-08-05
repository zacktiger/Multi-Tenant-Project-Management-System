const shareService = require('../services/share.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created } = require('../utils/response');

const getShareLink = asyncHandler(async (req, res) => {
  const data = await shareService.getShareLink({
    projectId: req.params.projectId,
    orgId: req.orgMember.organizationId,
  });
  return success(res, data, 'Share link');
});

const createShareLink = asyncHandler(async (req, res) => {
  const shareLink = await shareService.createShareLink({
    projectId: req.params.projectId,
    orgId: req.orgMember.organizationId,
    userId: req.user.userId,
    expiresInDays: req.body.expiresInDays,
  });
  // Wrapped in an object so the response shape matches GET /share, which can
  // also return { shareLink: null } when nothing is active.
  return created(res, { shareLink }, 'Share link created');
});

const revokeShareLink = asyncHandler(async (req, res) => {
  const data = await shareService.revokeShareLink({
    projectId: req.params.projectId,
    orgId: req.orgMember.organizationId,
    userId: req.user.userId,
  });
  return success(res, data, 'Share link revoked');
});

/**
 * Public — reached without authentication, so there is no req.user or
 * req.orgMember here. The share token in the URL is the only credential.
 */
const getPublicBoard = asyncHandler(async (req, res) => {
  const board = await shareService.getPublicBoard(req.params.token);
  return success(res, board, 'Shared board');
});

module.exports = { getShareLink, createShareLink, revokeShareLink, getPublicBoard };
