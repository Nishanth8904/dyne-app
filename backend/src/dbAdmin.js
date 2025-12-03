const mysql = require('mysql2/promise');

const adminPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Nishanth@2004',
  database: 'smartdine_admin'
});

module.exports = adminPool;