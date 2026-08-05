const activityService = require('../services/activity.service');
const asyncHandler = require('../middlewares/asyncHandler');
const parsePagination = require('../utils/pagination');
const { success } = require('../utils/response');

const getActivity = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 30 });

  const data = await activityService.getActivity(req.params.orgId, { page, limit });
  return success(res, data, 'Activity feed');
});

module.exports = { getActivity };
