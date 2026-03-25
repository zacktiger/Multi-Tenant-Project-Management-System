const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runSchema() {
  const schemaFile = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaFile, 'utf8');

  console.log('🏗️ Starting database schema creation...');
  
  try {
    await pool.query(sql);
    console.log('✅ Schema creation completed successfully');
  } catch (err) {
    console.error('❌ Schema creation failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSchema();
