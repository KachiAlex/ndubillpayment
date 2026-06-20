const knex = require('knex');
const config = require('../knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);

db.migrate.latest()
  .then(([batchNo, log]) => {
    if (log.length === 0) {
      console.log('Already up to date');
    } else {
      console.log('Ran migrations:', log);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
