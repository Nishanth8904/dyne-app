const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'smartdine_user',
  password: 'smartdine_pass',
  database: 'smartdine_db'
});

module.exports = pool.promise();