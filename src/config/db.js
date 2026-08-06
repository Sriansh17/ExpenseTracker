const { Pool } = require('pg');
const { env } = require('./env');

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

module.exports = pool;
