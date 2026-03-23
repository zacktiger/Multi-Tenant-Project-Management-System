function success(res, data = {}, message = 'OK', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

function error(res, message = 'Internal Server Error', statusCode = 500, code = 'SERVER_ERROR') {
  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
  });
}

function created(res, data = {}, message = 'Created successfully') {
  return success(res, data, message, 201);
}

function badRequest(res, message = 'Bad request', code = 'BAD_REQUEST') {
  return error(res, message, 400, code);
}

function unauthorized(res, message = 'Unauthorized', code = 'UNAUTHORIZED') {
  return error(res, message, 401, code);
}

function forbidden(res, message = 'Forbidden', code = 'FORBIDDEN') {
  return error(res, message, 403, code);
}

function notFound(res, message = 'Resource not found', code = 'NOT_FOUND') {
  return error(res, message, 404, code);
}

module.exports = { success, error, created, badRequest, unauthorized, forbidden, notFound };
