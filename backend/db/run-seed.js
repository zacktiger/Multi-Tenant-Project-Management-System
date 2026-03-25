const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function runSeed() {
  const seedFile = path.join(__dirname, 'seed.sql');
  const sql = fs.readFileSync(seedFile, 'utf8');

  console.log('🌱 Starting database seeding...');
  
  try {
    await pool.query(sql);
    console.log('✅ Seeding completed successfully');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSeed();
