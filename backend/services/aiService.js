// backend/services/aiService.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ask AI for SQL (SELECT-only, SQLite dialect)
async function generateSQL(prompt, schemaText) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Convert natural language to a SINGLE SQLite SQL query. " +
          "Use ONLY SELECT statements (no INSERT/UPDATE/DELETE/DDL). " +
          "Return ONLY the SQL, no explanations or markdown.",
      },
      {
        role: "user",
        content:
          `SCHEMA (SQLite):\n${schemaText}\n\nPROMPT:\n${prompt}\n\n` +
          "Output a single SELECT statement.",
      },
    ],
  });

  let sql = completion.choices[0].message.content.trim();
  sql = sql.replace(/```sql/gi, "").replace(/```/g, "").trim();
  return sql;
}

// Explain results
async function explainResults(prompt, sql, rows) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: "Explain SQL results in plain English briefly." },
      { role: "user", content: `Prompt: ${prompt}\nSQL: ${sql}\nRows: ${JSON.stringify(rows).slice(0, 6000)}` },
    ],
  });
  return completion.choices[0].message.content.trim();
}

module.exports = { generateSQL, explainResults };
// Add a simple general chat helper
async function chat(prompt, context = []) {
  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    ...context,
    { role: "user", content: prompt },
  ];
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    messages,
  });
  return completion.choices[0].message.content.trim();
}

module.exports.chat = chat;
