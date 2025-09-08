const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.generateSQL = async (naturalQuery) => {
  const prompt = `
You are an assistant that converts natural language into valid SQL for SQLite databases.
Only return the SQL query, nothing else.

User request: "${naturalQuery}"
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  return completion.choices[0].message.content.trim();
};
