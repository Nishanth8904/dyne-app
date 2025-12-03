const mysql = require('mysql2/promise');

const userPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Nishanth@2004',   // same as Workbench
  database: 'smartdine_users'
});

module.exports = userPool;