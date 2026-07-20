const { validationResult } = require('express-validator');
const shareService = require('../services/share.service');
const { success, created, badRequest } = require('../utils/response');

async function getShareLink(req, res, next) {
  try {
    const data = await shareService.getShareLink({
      projectId: req.params.projectId,
      orgId: req.orgMember.organizationId,
    });
    return success(res, data, 'Share link');
  } catch (err) {
    next(err);
  }
}

async function createShareLink(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const shareLink = await shareService.createShareLink({
      projectId: req.params.projectId,
      orgId: req.orgMember.organizationId,
      userId: req.user.userId,
      expiresInDays: req.body.expiresInDays,
    });
    return created(res, { shareLink }, 'Share link created');
  } catch (err) {
    next(err);
  }
}

async function revokeShareLink(req, res, next) {
  try {
    const data = await shareService.revokeShareLink({
      projectId: req.params.projectId,
      orgId: req.orgMember.organizationId,
      userId: req.user.userId,
    });
    return success(res, data, 'Share link revoked');
  } catch (err) {
    next(err);
  }
}

// Public — reached without authentication
async function getPublicBoard(req, res, next) {
  try {
    const board = await shareService.getPublicBoard(req.params.token);
    return success(res, board, 'Shared board');
  } catch (err) {
    next(err);
  }
}

module.exports = { getShareLink, createShareLink, revokeShareLink, getPublicBoard };
