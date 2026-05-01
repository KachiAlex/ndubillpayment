const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

client.connect()
  .then(() => client.query('SELECT NOW()'))
  .then(res => {
    console.log('DB connected:', res.rows[0]);
    return client.end();
  })
  .catch(err => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });
