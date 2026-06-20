const { Client } = require('pg');

async function test() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set');
    return;
  }

  const url = new URL(process.env.DATABASE_URL);
  console.log('Host:', url.hostname);
  console.log('Port:', url.port || '5432');
  console.log('Database:', url.pathname.replace(/^\//, ''));
  console.log('User:', decodeURIComponent(url.username));
  console.log('SSL mode:', url.searchParams.get('sslmode'));

  // Method 1: connectionString
  console.log('\n--- Method 1: connectionString ---');
  const client1 = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client1.connect();
    const res = await client1.query('SELECT NOW()');
    console.log('OK:', res.rows[0]);
    await client1.end();
  } catch (err) {
    console.log('FAILED:', err.message);
  }

  // Method 2: explicit params
  console.log('\n--- Method 2: explicit params ---');
  const client2 = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    database: url.pathname.replace(/^\//, ''),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client2.connect();
    const res = await client2.query('SELECT NOW()');
    console.log('OK:', res.rows[0]);
    await client2.end();
  } catch (err) {
    console.log('FAILED:', err.message);
  }
}

test().catch(e => console.log('Test error:', e.message));
