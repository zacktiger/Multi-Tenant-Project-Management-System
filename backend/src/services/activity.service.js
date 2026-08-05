const activityModel = require('../models/activity.model');

async function getActivity(orgId, { page, limit }) {
  return activityModel.getActivityByOrg(orgId, { page, limit });
}

/**
 * Writes an audit row without making the request wait for it.
 *
 * `setImmediate` defers the write to the next iteration of the event loop, so
 * the HTTP response is already on its way by the time the INSERT runs. The user
 * gets their result a few milliseconds sooner.
 *
 * Errors are caught and dropped on purpose. This is "fire and forget": if the
 * audit write fails, the action the user asked for still succeeded, and failing
 * their request over a logging problem would be the wrong call.
 *
 * The trade-off, stated plainly: if the process dies between the response and
 * the write, that row is lost forever. Fine for an activity feed. It would not
 * be acceptable for a compliance audit log, which would have to be written in
 * the same transaction as the action itself, or pushed onto a durable queue.
 *
 * This used to be a `fireActivity` helper duplicated in task.service.js and
 * share.service.js, plus a third copy inlined three times in project.service.js.
 */
function recordActivity({ organizationId, userId, action, entityType, entityId, metadata }) {
  setImmediate(async () => {
    try {
      await activityModel.logActivity({
        organizationId,
        userId,
        action,
        entityType,
        entityId,
        metadata,
      });
    } catch (err) {
      console.error('Activity log failed:', err.message);
    }
  });
}

module.exports = { getActivity, recordActivity };
