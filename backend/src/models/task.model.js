const { query, getClient } = require('../config/db');

/*
 * Models contain SQL and nothing else — no permission checks, no business
 * rules. Those live in the services. Anything reaching these functions has
 * already been authorised.
 *
 * Every value is passed as a $1-style placeholder rather than interpolated into
 * the string. That is what makes these queries immune to SQL injection: the
 * driver sends the query and the values separately, so a value can never be
 * parsed as SQL. The only interpolated fragments are column names drawn from
 * hardcoded allowlists in this file.
 */

/** Columns a PATCH is permitted to change. Guards against mass assignment. */
const UPDATABLE_FIELDS = ['title', 'description', 'priority', 'assigned_to', 'due_date'];

async function createTask({ projectId, organizationId, title, description, status, priority, assignedTo, createdBy, dueDate }) {
  const nextStatus = status || 'todo';

  /*
   * New tasks go to the bottom of their column.
   *
   * COALESCE(MAX(position), -1) + 1 reads as "one past the highest position,
   * or 0 if the column is empty" — MAX over no rows is NULL, and COALESCE
   * turns that into -1 so the arithmetic still lands on 0.
   */
  const posResult = await query(
    `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
     FROM tasks
     WHERE project_id = $1 AND status = $2 AND deleted_at IS NULL`,
    [projectId, nextStatus]
  );
  const position = posResult.rows[0].next_pos;

  const result = await query(
    `INSERT INTO tasks (project_id, organization_id, title, description, status, priority, assigned_to, created_by, due_date, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      projectId,
      organizationId,
      title,
      description || null,
      nextStatus,
      priority || 'medium',
      assignedTo || null,
      createdBy,
      dueDate || null,
      position,
    ]
  );
  return result.rows[0];
}

/**
 * Assembles the WHERE clause for a task listing.
 *
 * The tricky part of a dynamic query is keeping placeholder numbers in step
 * with the values array. Rather than tracking a separate counter (which has to
 * be incremented in exactly the right places), each filter pushes its value
 * first and then uses `values.length` — which is, by definition, the position
 * of the value just pushed. The two can't drift apart.
 *
 * `if (!value)` skips absent filters. Falsy values are not meaningful for any
 * of these columns — there is no task whose status is the empty string — so
 * treating them as "no filter" is correct here.
 */
function buildTaskFilter(projectId, orgId, { status, priority, assignedTo }) {
  // Always applied. `deleted_at IS NULL` is what makes soft deletes invisible;
  // omitting it anywhere would resurrect deleted tasks.
  const conditions = ['project_id = $1', 'organization_id = $2', 'deleted_at IS NULL'];
  const values = [projectId, orgId];

  const addFilter = (column, value) => {
    if (!value) return;
    values.push(value);
    conditions.push(`${column} = $${values.length}`);
  };

  addFilter('status', status);
  addFilter('priority', priority);
  addFilter('assigned_to', assignedTo);

  return { where: conditions.join(' AND '), values };
}

async function getTasksByProject(projectId, orgId, { status, priority, assignedTo, page = 1, limit = 20 } = {}) {
  const { where, values } = buildTaskFilter(projectId, orgId, { status, priority, assignedTo });
  const offset = (page - 1) * limit;

  // The page and the total count are independent queries, so issue them
  // together rather than waiting for one before starting the other.
  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT * FROM tasks
       WHERE ${where}
       ORDER BY status ASC, position ASC, created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    ),
    query(
      `SELECT COUNT(*)::int AS total FROM tasks WHERE ${where}`,
      values
    ),
  ]);

  return {
    tasks: dataResult.rows,
    total: countResult.rows[0].total,
    page,
    limit,
  };
}

async function findTaskById(taskId) {
  const result = await query(
    `SELECT * FROM tasks WHERE id = $1 AND deleted_at IS NULL`,
    [taskId]
  );
  return result.rows[0] || null;
}

/**
 * The org-scoped lookup, and the one services should use.
 *
 * The `organization_id` condition is the tenant boundary: a task belonging to
 * another organization simply doesn't match, so the caller gets a 404 rather
 * than a 403 that would confirm it exists.
 */
async function findTaskByIdAndOrg(taskId, orgId) {
  const result = await query(
    `SELECT * FROM tasks WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [taskId, orgId]
  );
  return result.rows[0] || null;
}

async function updateTask(taskId, orgId, fields) {
  // Only allowlisted columns are touched, so a caller cannot smuggle in
  // `organization_id` or `position` through the request body.
  const entries = Object.entries(fields).filter(([key]) => UPDATABLE_FIELDS.includes(key));
  if (entries.length === 0) return findTaskByIdAndOrg(taskId, orgId);

  // `key` is safe to interpolate because it survived the allowlist above;
  // the values remain parameterised.
  const setClauses = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values = entries.map(([, val]) => val);
  const offset = values.length;

  const result = await query(
    `UPDATE tasks
     SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $${offset + 1} AND organization_id = $${offset + 2} AND deleted_at IS NULL
     RETURNING *`,
    [...values, taskId, orgId]
  );
  return result.rows[0] || null;
}

/**
 * Moves a task to a given column and position.
 *
 * Two writes that must both happen or neither: first push everything at or
 * below the target down one slot to open a gap, then drop the task into it.
 * A crash between them would leave two tasks claiming the same position, so
 * they run inside a transaction.
 *
 * Cost note: this is O(n) in the size of the target column — moving a card in a
 * 500-task column issues 500 row updates. Fine at this scale; the standard fix
 * beyond it is fractional indexing (position 1.5 between 1 and 2), which makes
 * a move a single write.
 */
async function moveTask(taskId, orgId, { status, position }) {
  const task = await findTaskByIdAndOrg(taskId, orgId);
  if (!task) return null;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Open a gap at `position`. `id != $5` stops the task shifting itself.
    await client.query(
      `UPDATE tasks
       SET position = position + 1, updated_at = NOW()
       WHERE project_id = $1
         AND organization_id = $2
         AND status = $3
         AND position >= $4
         AND id != $5
         AND deleted_at IS NULL`,
      [task.project_id, orgId, status, position, taskId]
    );

    // Drop the task into the gap.
    const result = await client.query(
      `UPDATE tasks
       SET status = $1, position = $2, updated_at = NOW()
       WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [status, position, taskId, orgId]
    );

    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Must run on every path. A leaked client is never returned to the pool,
    // and once all 20 are leaked the API stops responding entirely.
    client.release();
  }
}

/** Soft delete: the row stays, `deleted_at` hides it from every read. */
async function softDeleteTask(taskId, orgId) {
  const result = await query(
    `UPDATE tasks SET deleted_at = NOW()
     WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
     RETURNING id, title`,
    [taskId, orgId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createTask,
  getTasksByProject,
  findTaskById,
  findTaskByIdAndOrg,
  updateTask,
  moveTask,
  softDeleteTask,
};
