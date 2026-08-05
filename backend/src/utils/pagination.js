/**
 * Reads `page` and `limit` from a query string and clamps them to a safe range.
 *
 * Replaces this pair of lines, which was repeated in three controllers:
 *
 *     const page = Math.max(1, parseInt(req.query.page) || 1);
 *     const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
 *
 * Clamping is not cosmetic. `limit` reaches a SQL LIMIT, so an unbounded value
 * would let any caller request the entire table in one request and turn a
 * normal endpoint into a denial-of-service lever. `page` is floored at 1
 * because a negative page produces a negative OFFSET, which Postgres rejects.
 *
 * Non-numeric input (`?page=abc`) falls back to the default rather than
 * erroring — the pagination is a convenience, not part of the contract.
 *
 * @param {object} query               req.query
 * @param {number} options.defaultLimit used when the caller doesn't specify one
 * @param {number} options.maxLimit     hard ceiling the caller cannot exceed
 */
function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit };
}

module.exports = parsePagination;
