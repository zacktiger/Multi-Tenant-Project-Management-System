/**
 * Wraps an async route handler so that a rejected promise is handed to
 * Express's error handler instead of vanishing.
 *
 * Why this is needed: Express 4 does not await route handlers. If an async
 * handler rejects, Express never sees it — the request hangs until it times
 * out and Node reports an unhandled rejection. The standard workaround is to
 * end every handler with:
 *
 *     catch (err) { next(err); }
 *
 * which was repeated in all ~25 controller functions here. This wrapper does
 * the same thing in one place, so controllers can just `await` and throw.
 *
 * Usage in a controller:
 *
 *     const getTask = asyncHandler(async (req, res) => {
 *       const task = await taskService.getTask({ ... });   // may throw
 *       return success(res, task, 'Task details');
 *     });
 */
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
