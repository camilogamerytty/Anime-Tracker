const mysql = require('mysql2/promise');

let pool;

if (process.env.MYSQL_URL) {
  // En Railway, usamos la URL completa que proporciona la variable MYSQL_URL
  pool = mysql.createPool(process.env.MYSQL_URL);
} else {
  // Configuración local (con tus credenciales locales)
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'anime_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
}

module.exports = pool;