import OpenAI from "openai";
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateSQL(naturalText) {
  try {
    const prompt = `
Convert the user's request into a safe SQLite SELECT statement only.
Do not generate INSERT, UPDATE, DELETE, DROP, or any unsafe commands.
Respond ONLY with SQL code, without any explanations or markdown formatting.

User query: "${naturalText}"
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    });

    let sql = response.choices[0].message.content.trim();
    console.log("Raw AI response:", sql);

    // Extract SQL from code blocks if present
    const sqlMatch = sql.match(/```sql\n([^```]*)\n```/);
    if (sqlMatch) {
      sql = sqlMatch[1].trim();
    }
    
    // Remove any non-SQL text
    sql = sql.replace(/.*SELECT/i, 'SELECT').trim();
    
    console.log("Processed SQL:", sql);

    // Safety check
    if (!sql.toLowerCase().startsWith("select")) {
      console.log("Failed safety check - not a SELECT statement");
      return null;
    }

    return sql;
  } catch (err) {
    console.error("AI SQL generation error:", err);
    return null;
  }
}