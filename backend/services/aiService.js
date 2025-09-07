// services/aiService.js
const OpenAI = require("openai");
const { validateQuery } = require("../middlewares/queryMiddleware");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a parameterized, SELECT-only SQL query from natural language.
 * @param {string} prompt - user question
 * @param {object} schema - { tables: [{name, columns:[{name,type}], fks: [...] }], dialect }
 * @param {string} dialect - 'sqlite' | 'mysql' | 'postgres'
 */
async function generateSQLFromPrompt(prompt, schema, dialect = "sqlite") {
  const system = `
You are a careful SQL assistant. Return ONLY a single ${dialect.toUpperCase()} SQL SELECT statement, no comments.
Rules:
- Use ONLY tables/columns from the provided SCHEMA.
- No writes (INSERT/UPDATE/DELETE/DDL); SELECT ... LIMIT 100.
- Avoid multiple statements or semicolons. No comments.
- Prefer explicit column lists over SELECT *.
SCHEMA (JSON):
${JSON.stringify(schema).slice(0, 6000)}  // keep prompt small
  `.trim();

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Question: ${prompt}\nReturn only SQL.` }
    ],
    temperature: 0.1
  });

  let sql = (resp.choices?.[0]?.message?.content || "").trim();

  // normalize: remove trailing semicolon and whitespace
  sql = sql.replace(/;+\s*$/g, "");

  // guardrails (reuse your middleware fn)
  validateQuery(sql);

  // enforce limit (basic inject if missing)
  if (!/limit\s+\d+/i.test(sql)) sql = `${sql} LIMIT 100`;

  return sql;
}

module.exports = { generateSQLFromPrompt };
