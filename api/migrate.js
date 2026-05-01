const database = require('../backend/utils/database');

module.exports = async (req, res) => {
  if (req.query.secret !== 'fix-bursar-2025') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Make matric_number nullable
    await database.db.raw(`
      ALTER TABLE users 
      ALTER COLUMN matric_number DROP NOT NULL
    `);

    // Remove placeholder matric from bursar
    await database.db('users')
      .where({ email: 'bursar@ndu.edu.ng' })
      .update({ matric_number: null });

    const bursar = await database.db('users')
      .where({ email: 'bursar@ndu.edu.ng' })
      .first();

    res.json({
      success: true,
      bursar: {
        id: bursar.id,
        email: bursar.email,
        matric_number: bursar.matric_number,
        user_type: bursar.user_type
      }
    });
  } catch (err) {
    console.error('[migrate]', err);
    res.status(500).json({ error: err.message });
  }
};
