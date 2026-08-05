const authService = require('../services/auth.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created } = require('../utils/response');

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, orgName } = req.body;
  const data = await authService.signup({ name, email, password, orgName });
  return created(res, data, 'Account created successfully');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await authService.login({ email, password });
  return success(res, data, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const data = await authService.refresh({ refreshToken: req.body.refreshToken });
  return success(res, data, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout({ refreshToken: req.body.refreshToken });
  return success(res, null, 'Logged out');
});

const getMe = asyncHandler(async (req, res) => {
  // req.user is set by the `authenticate` middleware from the verified JWT.
  const data = await authService.getMe(req.user.userId);
  return success(res, data, 'User profile');
});

const switchOrganization = asyncHandler(async (req, res) => {
  const data = await authService.switchOrganization({
    userId: req.user.userId,
    orgId: req.params.orgId,
  });
  return success(res, data, 'Organization switched');
});

const acceptInvitation = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const data = await authService.acceptInvitation({
    token: req.params.token,
    name,
    password,
  });
  return created(res, data, 'Invitation accepted successfully');
});

const getInvitation = asyncHandler(async (req, res) => {
  const data = await authService.getInvitation(req.params.token);
  return success(res, data, 'Invitation details');
});

module.exports = {
  signup,
  login,
  refresh,
  logout,
  getMe,
  acceptInvitation,
  getInvitation,
  switchOrganization,
};
