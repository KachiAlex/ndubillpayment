const database = require('../utils/database');

async function check() {
  try {
    const res = await database.db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tables:', res.rows.map(r => r.table_name).join(', '));

    const mig = await database.db('knex_migrations').select('name').orderBy('id', 'desc');
    console.log('\nLast migrations:', mig.slice(0, 5).map(m => m.name));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}
check();
