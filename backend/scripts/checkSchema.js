const database = require('../utils/database');

async function checkSchema() {
  try {
    // Check users table schema
    const usersCols = await database.db.raw(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('\n=== users columns ===');
    console.table(usersCols.rows);

    // Check wallets table schema
    const walletsCols = await database.db.raw(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'wallets'
      ORDER BY ordinal_position
    `);
    console.log('\n=== wallets columns ===');
    console.table(walletsCols.rows);

    // Check transactions table schema
    const txCols = await database.db.raw(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      ORDER BY ordinal_position
    `);
    console.log('\n=== transactions columns ===');
    console.table(txCols.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkSchema();
