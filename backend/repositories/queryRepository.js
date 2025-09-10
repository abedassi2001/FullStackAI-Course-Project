// backend/repositories/queryRepository.js
const Query = require("../models/query");

const create = async (data) => {
  return await Query.create(data);
};

const findById = async (id) => {
  return await Query.findByPk(id);
};

const findAll = async () => {
  return await Query.findAll();
};

const update = async (id, updates) => {
  const query = await Query.findByPk(id);
  if (!query) return null;
  return await query.update(updates);
};

const remove = async (id) => {
  const query = await Query.findByPk(id);
  if (!query) return null;
  await query.destroy();
  return true;
};

module.exports = { create, findById, findAll, update, remove };
