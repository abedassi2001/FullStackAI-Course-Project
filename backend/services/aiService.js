const OpenAI = require("openai");
const sqlite3 = require("sqlite3").verbose();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Run SQL against SQLite
async function runSQL(dbFilePath, sql) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbFilePath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) return reject(err);
    });

    db.all(sql, (err, rows) => {
      db.close();
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Ask AI for SQL
async function generateSQL(prompt, schemaDescription) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a SQL generator. Convert natural language to VALID SQLite SQL. " +
          "Return ONLY the SQL statement, no explanations, no markdown, no code fences."
      },
      { role: "user", content: `Schema: ${schemaDescription}\n\nPrompt: ${prompt}` },
    ],
  });

  let sql = completion.choices[0].message.content.trim();

  // 🧹 Clean: remove code fences if AI added them
  sql = sql.replace(/```sql/gi, "").replace(/```/g, "").trim();

  return sql;
}


// Ask AI to explain results
async function explainResults(prompt, sql, rows) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant that explains SQL results in plain English." },
      { role: "user", content: `Prompt: ${prompt}\nSQL: ${sql}\nResults: ${JSON.stringify(rows)}` },
    ],
  });

  return completion.choices[0].message.content.trim();
}

module.exports = { generateSQL, runSQL, explainResults };
