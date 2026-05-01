require('dotenv').config({ path: require('path').join(__dirname, '.env') });

function getConnection() {
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      // Strip channel_binding which can hang pg in serverless
      parsed.searchParams.delete('channel_binding');
      // Force SSL for Neon
      const sslmode = parsed.searchParams.get('sslmode');

      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        database: parsed.pathname.replace(/^\//, ''),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        ssl: sslmode === 'require' || sslmode === 'prefer' ? { rejectUnauthorized: false } : { rejectUnauthorized: false }
      };
    } catch {
      // Fallback: pass as connection string with SSL
      return {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      };
    }
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
