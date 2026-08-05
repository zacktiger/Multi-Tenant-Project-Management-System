/**
 * Builds an object from `source` containing only the listed keys whose value
 * is not `undefined`.
 *
 * Used by PATCH handlers, which accept partial updates. Replaces chains like:
 *
 *     const fields = {};
 *     if (title !== undefined) fields.title = title;
 *     if (description !== undefined) fields.description = description;
 *     ...
 *
 * The `undefined` check is deliberate and is *not* the same as a falsy check.
 * A caller may legitimately send `null` to clear a field (unassign a task, drop
 * a due date), and `null` must survive. Only "the client didn't mention this
 * field at all" — `undefined` — gets dropped.
 *
 * @param {object} source  usually req.body
 * @param {string[]} keys  the fields this endpoint is willing to accept
 */
function pickDefined(source, keys) {
  const result = {};
  for (const key of keys) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = pickDefined;
