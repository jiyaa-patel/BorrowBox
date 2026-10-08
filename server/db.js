const mysql = require('mysql2/promise');

// TLS for hosted databases (TiDB Cloud, Aiven, ...). DB_SSL=true turns it on.
// DB_CA is optional: paste the provider's CA certificate (PEM text) if its certificate is not signed by a public CA (Aiven needs this).
function sslOptions() {
  if (process.env.DB_SSL !== 'true') return undefined;
  const ssl = { minVersion: 'TLSv1.2' };
  if (process.env.DB_CA) ssl.ca = process.env.DB_CA.replace(/\\n/g, '\n');
  return ssl;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306, // TiDB Cloud uses 4000, Aiven uses its own port
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,
  waitForConnections: true,
  // Every serverless instance has its own pool, so keep it small to stay under the database's connection limit.
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 5,
  enableKeepAlive: true,
  ssl: sslOptions()
});

// Make CURDATE()/NOW() in SQL follow the campus timezone (Vercel and most hosted databases run in UTC).
const offset = process.env.DB_TIMEZONE || '+05:30';
pool.pool.on('connection', conn => conn.query(`SET time_zone = '${offset.replace(/[^+\-0-9:]/g, '')}'`));

module.exports = pool;
