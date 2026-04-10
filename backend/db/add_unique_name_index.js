const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function run() {
  try {
    // Find duplicates first
    const dupes = await pool.query(`
      SELECT workspace_id, LOWER(name) as lname, COUNT(*) as cnt
      FROM projects
      WHERE deleted_at IS NULL
      GROUP BY workspace_id, LOWER(name)
      HAVING COUNT(*) > 1;
    `);
    
    if (dupes.rows.length > 0) {
      console.log('Found duplicate project names:');
      console.log(JSON.stringify(dupes.rows, null, 2));
      
      // Soft-delete the older duplicates, keeping the newest
      for (const row of dupes.rows) {
        await pool.query(`
          UPDATE projects
          SET deleted_at = NOW()
          WHERE workspace_id = $1
            AND LOWER(name) = $2
            AND deleted_at IS NULL
            AND id != (
              SELECT id FROM projects
              WHERE workspace_id = $1 AND LOWER(name) = $2 AND deleted_at IS NULL
              ORDER BY created_at DESC
              LIMIT 1
            );
        `, [row.workspace_id, row.lname]);
        console.log('Soft-deleted older duplicates for:', row.lname);
      }
    } else {
      console.log('No duplicates found.');
    }

    // Now create the index
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_unique_name_per_workspace
      ON projects (workspace_id, LOWER(name))
      WHERE deleted_at IS NULL;
    `);
    console.log('Index created successfully');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
