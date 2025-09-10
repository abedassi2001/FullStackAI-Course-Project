// query.model.js
const { DataTypes } = require("sequelize");
const sequelize = require("../utils/mysql.db");

const Query = sequelize.define("Query", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  prompt: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM("pending", "done"), defaultValue: "pending" },
}, { timestamps: true });

module.exports = Query;
