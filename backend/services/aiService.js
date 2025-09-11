// backend/services/aiService.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ask AI for SQL (supports SELECT, INSERT, UPDATE, DELETE)
async function generateSQL(prompt, schemaText, userId) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Convert natural language to a SINGLE MySQL SQL query. " +
          "You can use SELECT, INSERT, UPDATE, DELETE statements. " +
          "For INSERT: Use proper VALUES syntax. " +
          "For UPDATE: Always include WHERE clause to prevent updating all rows. " +
          "For DELETE: Always include WHERE clause to prevent deleting all rows. " +
          "For database metadata queries: " +
          "- 'show tables' or 'list tables' or 'table names' → use SHOW TABLES " +
          "- 'describe table X' or 'table structure' → use DESCRIBE table_name " +
          "- 'show columns from X' → use SHOW COLUMNS FROM table_name " +
          "Return ONLY the SQL, no explanations or markdown. " +
          "Use MySQL syntax, not SQLite.",
      },
      {
        role: "user",
        content:
          `SCHEMA (MySQL):\n${schemaText}\n\nPROMPT:\n${prompt}\n\n` +
          "Output a single SQL statement. Remember: This is for user ${userId}'s private database.",
      },
    ],
  });

  let sql = completion.choices[0].message.content.trim();
  sql = sql.replace(/```sql/gi, "").replace(/```/g, "").trim();
  return sql;
}

// Explain results and provide conversational response
async function explainResults(prompt, sql, rows, operationType = 'SELECT') {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { 
        role: "system", 
        content: `You are a helpful database assistant. Explain what you did and provide a conversational response. 
        
        For SELECT queries: Explain what data was retrieved and summarize the results.
        For INSERT queries: Confirm what was added and show the new data.
        For UPDATE queries: Explain what was changed and show the affected rows.
        For DELETE queries: Confirm what was removed and show remaining data.
        For metadata queries (SHOW TABLES, DESCRIBE, etc.): Explain what database structure information was retrieved.
        
        Be conversational, helpful, and provide context about the database operation.` 
      },
      { 
        role: "user", 
        content: `User asked: "${prompt}"
        
SQL executed: ${sql}
Operation type: ${operationType}
Results: ${JSON.stringify(rows).slice(0, 6000)}

Please explain what happened and provide a helpful response.` 
      },
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

// Generate SQLite DDL from a natural language spec
async function generateDDL(spec) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: "Given a natural language schema description, output pure SQLite DDL statements to create the database. Only output SQL (CREATE TABLE..., constraints). No explanations. Avoid DROP statements. Use reasonable types (INTEGER, TEXT, REAL)." },
      { role: "user", content: spec }
    ]
  });
  let ddl = completion.choices[0].message.content.trim();
  ddl = ddl.replace(/```sql/gi, "").replace(/```/g, "").trim();
  return ddl;
}

module.exports.generateDDL = generateDDL;
