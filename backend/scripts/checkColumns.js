const database = require('../utils/database');

async function check() {
  const result = await database.db.raw(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
  );
  console.log('Users table columns:');
  result.rows.forEach(r => console.log(' -', r.column_name));
  process.exit(0);
}

check().catch(e => {
  console.error(e.message);
  process.exit(1);
});
