// backend/services/aiService.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ask AI for SQL (optimized for speed)
async function generateSQL(prompt, schemaText, userId) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 500, // Limit response length for faster generation
    messages: [
      {
        role: "system",
        content: `You are a SQL expert. Convert natural language to MySQL queries.

RULES:
- Use only tables from the provided schema
- Return ONLY the SQL query, no explanations
- Use proper MySQL syntax
- For INSERT: provide actual values, not placeholders
- For CREATE TABLE: include auto-increment primary key
- For UPDATE/DELETE: always use WHERE clauses

PATTERNS:
- "Show/Get/Find" → SELECT
- "Add/Create new [record]" → INSERT (if table exists)
- "Create [table]" → CREATE TABLE
- "Change/Update" → UPDATE
- "Remove/Delete" → DELETE
- "Drop [table]" → DROP TABLE`
      },
      {
        role: "user",
        content: `Schema: ${schemaText}\n\nRequest: ${prompt}\n\nSQL:`,
      },
    ],
  });

  let sql = completion.choices[0].message.content.trim();
  sql = sql.replace(/```sql/gi, "").replace(/```/g, "").trim();
  return sql;
}

// Explain results (optimized for speed)
async function explainResults(prompt, sql, rows, operationType = 'SELECT') {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2, // Reduced for faster, more consistent responses
    max_tokens: 300, // Limit response length
    messages: [
      { 
        role: "system", 
        content: `Explain database operations concisely. Be helpful and conversational.` 
      },
      { 
        role: "user", 
        content: `Query: ${sql}\nResults: ${JSON.stringify(rows).slice(0, 2000)}\nExplain briefly:` 
      },
    ],
  });
  return completion.choices[0].message.content.trim();
}

// General chat (optimized)
async function chat(prompt, context = []) {
  const messages = [
    { role: "system", content: "You are a helpful assistant. Be concise." },
    ...context,
    { role: "user", content: prompt },
  ];
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4, // Reduced for faster responses
    max_tokens: 400, // Limit response length
    messages,
  });
  return completion.choices[0].message.content.trim();
}

// Extract schema name (optimized)
async function extractSchemaName(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    max_tokens: 50, // Very short response
    messages: [
      {
        role: "system",
        content: `Extract schema/database name from requests. Return only the name or "null".`
      },
      { role: "user", content: prompt },
    ],
  });
  return completion.choices[0].message.content.trim();
}

// Generate chat title from first message
async function generateChatTitle(firstMessage) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 30, // Short title
    messages: [
      {
        role: "system",
        content: `Generate a short, descriptive title (max 5 words) for a chat based on the first user message. Return only the title, no quotes or formatting.`
      },
      { role: "user", content: firstMessage },
    ],
  });
  return completion.choices[0].message.content.trim();
}

module.exports = {
  generateSQL,
  explainResults,
  chat,
  extractSchemaName,
  generateChatTitle,
};