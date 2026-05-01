const db = require('./backend/utils/database').db;

db.raw("SELECT column_name, is_nullable, data_type, column_default FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
  .then(r => {
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  })
  .catch(e => {
    console.error(e.message);
    process.exit(1);
  });
