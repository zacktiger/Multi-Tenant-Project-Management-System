const { query, getClient } = require('../config/db');

async function createTask({ projectId, organizationId, title, description, status, priority, assignedTo, createdBy, dueDate }) {
  const nextStatus = status || 'todo';
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

async function getTasksByProject(projectId, orgId, { status, priority, assignedTo, page = 1, limit = 20 } = {}) {
  const conditions = [
    'project_id = $1',
    'organization_id = $2',
    'deleted_at IS NULL',
  ];
  const values = [projectId, orgId];
  let paramIdx = 3;

  if (status) {
    conditions.push(`status = $${paramIdx++}`);
    values.push(status);
  }
  if (priority) {
    conditions.push(`priority = $${paramIdx++}`);
    values.push(priority);
  }
  if (assignedTo) {
    conditions.push(`assigned_to = $${paramIdx++}`);
    values.push(assignedTo);
  }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT * FROM tasks
       WHERE ${where}
       ORDER BY status ASC, position ASC, created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
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

async function findTaskByIdAndOrg(taskId, orgId) {
  const result = await query(
    `SELECT * FROM tasks WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
    [taskId, orgId]
  );
  return result.rows[0] || null;
}

async function updateTask(taskId, orgId, fields) {
  const allowed = ['title', 'description', 'priority', 'assigned_to', 'due_date'];
  const entries = Object.entries(fields).filter(([key]) => allowed.includes(key));
  if (entries.length === 0) return findTaskByIdAndOrg(taskId, orgId);

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

async function moveTask(taskId, orgId, { status, position }) {
  const task = await findTaskByIdAndOrg(taskId, orgId);
  if (!task) return null;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Shift tasks in the target column to make room
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
    client.release();
  }
}

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
