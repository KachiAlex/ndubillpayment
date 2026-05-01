require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('../utils/database');

const email = 'bursar@ndu.edu.ng';
const password = 'bursar123';
const firstName = 'NDU';
const lastName = 'Bursar';

(async () => {
  try {
    const existing = await db('users').where({ email }).first();
    const hashedPassword = await bcrypt.hash(password, 12);

    if (existing) {
      await db('users').where({ id: existing.id }).update({
        password: hashedPassword,
        updated_at: new Date()
      });
      console.log('Bursar password updated:', email);
    } else {
      const [userId] = await db('users').insert({
        matric_no: 'ADMIN001',
        email,
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        user_type: 'bursar',
        department: 'Administration',
        session: 'N/A',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('Bursar account created:', email, 'ID:', userId);
    }
    process.exit(0);
  } catch (e) {
    console.error('Error creating/updating bursar:', e);
    process.exit(1);
  }
})();
