// query.model.js
// This file defines the Query table schema for MySQL.
// If you are using Sequelize ORM, define a model here with fields:
//  - id (primary key, auto-increment)
//  - userId (foreign key to Users table)
//  - title (string, required)
//  - description (text, required)
//  - status (enum: 'open' | 'closed', default 'open')
//  - createdAt, updatedAt (timestamps)
//
// Example with Sequelize:
// module.exports = (sequelize, DataTypes) => {
//   const Query = sequelize.define("Query", {
//     id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
//     userId: { type: DataTypes.INTEGER, allowNull: false },
//     title: { type: DataTypes.STRING, allowNull: false },
//     description: { type: DataTypes.TEXT, allowNull: false },
//     status: { type: DataTypes.ENUM("open", "closed"), defaultValue: "open" }
//   });
//   return Query;
// };
