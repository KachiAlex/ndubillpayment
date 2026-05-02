const database = require('../utils/database');

async function listUsers() {
  try {
    const users = await database.db('users')
      .select('id', 'email', 'first_name', 'last_name', 'matric_number', 'user_type', 'department', 'level', 'is_verified', 'created_at')
      .orderBy('created_at', 'desc');

    console.log('\n=== Users in Database ===\n');
    console.table(users.map(u => ({
      ...u,
      created_at: u.created_at ? u.created_at.toISOString().slice(0, 19).replace('T', ' ') : null
    })));
    console.log(`\nTotal users: ${users.length}`);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

listUsers();
