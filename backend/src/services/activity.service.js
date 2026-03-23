const activityModel = require('../models/activity.model');

async function getActivity(orgId, { page, limit }) {
  return activityModel.getActivityByOrg(orgId, { page, limit });
}

module.exports = { getActivity };
