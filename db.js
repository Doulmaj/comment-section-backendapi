const mysql = require('mysql2');
const env = process.env;
require('dotenv').config();

const pool = mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    database: env.DATABASE,
    waitForConnections: true,
    connectionLimit: 10, //limite de connexion simultanée
    queueLimit: 0,
});

module.exports = pool.promise(); // Utilisation des promesses pour une gestion asynchrone
