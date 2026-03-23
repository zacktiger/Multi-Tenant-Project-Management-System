const activityService = require('../services/activity.service');
const { success } = require('../utils/response');

async function getActivity(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 30));

    const data = await activityService.getActivity(req.params.orgId, { page, limit });
    return success(res, data, 'Activity feed');
  } catch (err) {
    next(err);
  }
}

module.exports = { getActivity };
