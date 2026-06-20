const database = require('../utils/database');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const email = 'bursar@ndu.edu.ng';
    const plainPassword = 'bursar123';
    const hash = await bcrypt.hash(plainPassword, 12);

    const updated = await database.db('users')
      .where({ email })
      .update({ password_hash: hash, updated_at: new Date() })
      .returning('*');

    if (updated.length === 0) {
      console.log('Bursar not found, creating...');
      const [user] = await database.db('users')
        .insert({
          id: require('crypto').randomUUID(),
          email,
          password_hash: hash,
          first_name: 'Bursar',
          last_name: 'Admin',
          user_type: 'bursar',
          department: 'Finance',
          level: 'Staff',
          matric_number: null,
          is_verified: true
        })
        .returning('*');
      console.log('Created bursar:', user.email);
    } else {
      console.log('Password reset for:', updated[0].email);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

resetPassword();
