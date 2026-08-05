/**
 * An Error that also carries the HTTP status and machine-readable code that
 * should be sent back to the client.
 *
 * Every failure used to be assembled by hand, four lines at a time:
 *
 *     const err = new Error('Task not found');
 *     err.statusCode = 404;
 *     err.code = 'TASK_NOT_FOUND';
 *     throw err;
 *
 * That pattern appeared ~25 times across the services. It now reads:
 *
 *     throw notFound('Task not found', 'TASK_NOT_FOUND');
 *
 * The resulting object has exactly the same shape as before — a plain Error
 * with `statusCode` and `code` properties — so `errorHandler` did not need to
 * change. It still reads those two fields and knows nothing about this class.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'SERVER_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    // Point the stack trace at wherever this was thrown, not at this constructor.
    Error.captureStackTrace(this, AppError);
  }
}

/*
 * Named constructors for the statuses this API actually returns.
 *
 * Using `notFound(...)` instead of `new AppError(msg, 404, code)` means the
 * status number is written once, here, rather than at every throw site where a
 * typo would produce a silently wrong response.
 */
const badRequest = (message, code = 'BAD_REQUEST') => new AppError(message, 400, code);
const unauthorized = (message, code = 'UNAUTHORIZED') => new AppError(message, 401, code);
const forbidden = (message, code = 'FORBIDDEN') => new AppError(message, 403, code);
const notFound = (message, code = 'NOT_FOUND') => new AppError(message, 404, code);
const conflict = (message, code = 'CONFLICT') => new AppError(message, 409, code);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
