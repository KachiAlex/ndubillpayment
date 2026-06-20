const bcrypt = require('bcryptjs');
const database = require('../utils/database');

async function createBursar() {
  const password_hash = await bcrypt.hash('busar123', 10);

  const existing = await database.db('users').where({ email: 'bursar@ndu.edu.ng' }).first();

  let user;
  if (existing) {
    [user] = await database.db('users').where({ email: 'bursar@ndu.edu.ng' }).update({
      password_hash,
      first_name: 'Bursar',
      last_name: 'Admin',
      department: 'Finance',
      level: 'Staff',
      session: '2023/2024',
      user_type: 'bursar',
      is_verified: true
    }).returning('*');
    console.log('Bursar user updated:', user.email);
  } else {
    [user] = await database.db('users').insert({
      email: 'bursar@ndu.edu.ng',
      password_hash,
      first_name: 'Bursar',
      last_name: 'Admin',
      department: 'Finance',
      level: 'Staff',
      session: '2023/2024',
      user_type: 'bursar',
      is_verified: true
    }).returning('*');
    console.log('Bursar user created:', user.email);
  }

  process.exit(0);
}

if (require.main === module) {
  createBursar().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createBursar };
