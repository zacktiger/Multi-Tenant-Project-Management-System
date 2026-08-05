const { validationResult } = require('express-validator');
const { badRequest } = require('../utils/response');

/**
 * Rejects the request if any express-validator rule on the route failed.
 *
 * The `body(...)` rules declared on a route only *collect* problems — something
 * still has to inspect the result and decide to reject. That check used to be
 * copy-pasted as the first four lines of every mutating controller. Moving it
 * into the route chain lets each controller start at its happy path.
 *
 * Only the first failure is reported, which matches the previous behaviour and
 * keeps the error a single readable sentence rather than an array.
 *
 * Placement matters. This is registered *after* `requireOrgRole`, so a viewer
 * who sends a malformed payload still gets 403 (not authorised) rather than
 * 400 (bad input) — we don't tell a caller their body is wrong on an endpoint
 * they were never allowed to reach.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, errors.array()[0].msg, 'VALIDATION_ERROR');
  }
  next();
}

module.exports = validate;
