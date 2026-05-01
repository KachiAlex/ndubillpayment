require('dotenv').config({ path: require('path').join(__dirname, '.env') });

function getConnection() {
  if (process.env.DATABASE_URL) {
    // Strip channel_binding which can hang pg in serverless
    let url = process.env.DATABASE_URL;
    try {
      const parsed = new URL(url);
      parsed.searchParams.delete('channel_binding');
      if (!parsed.searchParams.has('sslmode')) {
        parsed.searchParams.set('sslmode', 'require');
      }
      url = parsed.toString();
    } catch {
      // ignore parse errors, use raw string
    }
    return { connectionString: url, ssl: { rejectUnauthorized: false } };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ndu_tuition',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

module.exports = {
  development: {
    client: 'postgresql',
    connection: getConnection(),
    pool: { min: 0, max: 5 },
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds'
    }
  },
  production: {
    client: 'postgresql',
    connection: getConnection(),
    pool: { min: 0, max: 5 },
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds'
    }
  }
};
