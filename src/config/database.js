const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  connectionLimit: 5,
  enableKeepAlive: true,
  decimalNumbers: true,
  dateStrings: true
});

pool.on('connection', (conexao) => {
  conexao.query("SET time_zone = '-03:00'");
});

module.exports = pool;
