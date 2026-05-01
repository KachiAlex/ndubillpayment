const bcrypt = require('bcryptjs');
const database = require('../utils/database');

async function createBursar() {
  const password_hash = await bcrypt.hash('Admin123!', 10);

  const [user] = await database.db('users').insert({
    matric_no: 'ADMIN001',
    email: 'bursar@ndu.edu.ng',
    password_hash,
    first_name: 'Bursar',
    last_name: 'Admin',
    department: 'Finance',
    level: 'Staff',
    role: 'bursar',
    is_verified: true
  }).returning('*').onConflict('email').merge();

  console.log('Bursar user created/updated:', user.email);
  process.exit(0);
}

if (require.main === module) {
  createBursar().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createBursar };
