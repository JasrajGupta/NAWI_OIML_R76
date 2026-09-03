const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('  [DB] MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('  [DB] MySQL connection FAILED:', err.message);
    console.error('  [DB] Check your .env file and make sure MySQL is running');
  });

module.exports = pool;