const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Load .env.local from root with override to avoid wrong DATABASE_URL
dotenv.config({ path: path.join(__dirname, '../../.env.local'), override: true });

let DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Strip channel_binding to prevent local pg driver hang
DATABASE_URL = DATABASE_URL.replace(/[?&]channel_binding=[^&]*/, '').replace(/\?&/, '?').replace(/\?$/, '');
console.log('Connecting with:', DATABASE_URL.replace(/:([^:@]+)@/, ':****@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateBursar() {
  const client = await pool.connect();
  try {
    // Make matric_number nullable if not already
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN matric_number DROP NOT NULL
    `);
    console.log('Made matric_number nullable');
  } catch (e) {
    if (e.message.includes('is not a')) {
      console.log('matric_number already nullable or different error:', e.message);
    } else {
      throw e;
    }
  }

  // Update bursar to remove matric_number
  const res = await client.query(`
    UPDATE users 
    SET matric_number = NULL 
    WHERE email = 'bursar@ndu.edu.ng'
    RETURNING id, email, matric_number, user_type
  `);

  if (res.rowCount === 0) {
    console.log('Bursar not found');
  } else {
    console.log('Bursar updated:', res.rows[0]);
  }

  client.release();
  await pool.end();
}

updateBursar().catch(err => {
  console.error(err);
  process.exit(1);
});
