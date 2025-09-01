// mysql.db.js
// This file sets up the MySQL database connection.
// If you use Sequelize ORM, initialize Sequelize here.
// If you use mysql2, create a pool here.
//
// ✅ Example with mysql2:
// const mysql = require("mysql2/promise");
// const pool = mysql.createPool({
//   host: process.env.MYSQL_HOST,
//   user: process.env.MYSQL_USER,
//   password: process.env.MYSQL_PASS,
//   database: process.env.MYSQL_DB
// });
// module.exports = pool;
//
// ✅ Example with Sequelize:
// const { Sequelize } = require("sequelize");
// const sequelize = new Sequelize(process.env.MYSQL_DB, process.env.MYSQL_USER, process.env.MYSQL_PASS, {
//   host: process.env.MYSQL_HOST,
//   dialect: "mysql"
// });
// module.exports = sequelize;
//
// NOTE: Decide which library you’ll use (mysql2 vs Sequelize).
// - mysql2 → write raw SQL queries in repositories
// - Sequelize → use ORM models in /models folder
