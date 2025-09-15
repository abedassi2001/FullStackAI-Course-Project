// services/queryService.js
const queryRepository = require("../repositories/queryRepository"); // <-- THIS IS REQUIRED

exports.createQuery = async (userId, prompt) => {
  if (!prompt) throw new Error("Prompt is required");
  return await queryRepository.create({ userId, prompt });
};

exports.getAllQueries = async () => {
  return await queryRepository.findAll();
};

exports.getQueryById = async (id) => {
  const query = await queryRepository.findById(id);
  if (!query) throw new Error("Query not found");
  return query;
};

exports.updateQuery = async (id, updates) => {
  const query = await queryRepository.update(id, updates);
  if (!query) throw new Error("Query not found");
  return query;
};

exports.deleteQuery = async (id) => {
  const query = await queryRepository.delete(id);
  if (!query) throw new Error("Query not found");
  return query;
};

exports.getUserQueries = async (userId) => {
  return await queryRepository.findByUserId(userId);
};