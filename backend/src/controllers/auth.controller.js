const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');
const { success, created, badRequest } = require('../utils/response');

async function signup(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const { name, email, password, orgName } = req.body;
    const data = await authService.signup({ name, email, password, orgName });
    return created(res, data, 'Account created successfully');
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const { email, password } = req.body;
    const data = await authService.login({ email, password });
    return success(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const { refreshToken } = req.body;
    const data = await authService.refresh({ refreshToken });
    return success(res, data, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    const { refreshToken } = req.body;
    await authService.logout({ refreshToken });
    return success(res, null, 'Logged out');
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const data = await authService.getMe(req.user.userId);
    return success(res, data, 'User profile');
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, refresh, logout, getMe };

