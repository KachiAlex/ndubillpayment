const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load .env.local from root
dotenv.config({ path: path.join(__dirname, '.env.local'), override: true });

let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Strip channel_binding to prevent local pg driver hang
DATABASE_URL = DATABASE_URL.replace(/[?&]channel_binding=[^&]*/, '').replace(/\?&/, '?').replace(/\?$/, '');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listUsers() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, email, first_name, last_name, matric_number, user_type, department, level, is_verified, created_at
      FROM users
      ORDER BY created_at DESC
    `);
    console.log('\n=== Users in Database ===\n');
    console.table(res.rows);
    console.log(`\nTotal users: ${res.rowCount}`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

listUsers();
