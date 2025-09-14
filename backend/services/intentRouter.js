// backend/services/intentRouter.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Intelligent intent detection using AI
 * Determines what the user wants to do based on their message
 */
async function detectIntent(message, hasDatabase = false) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You are an intelligent intent classifier for a database AI assistant. 
        
        Analyze the user's message and determine their intent. Return ONLY a JSON object with this structure:
        {
          "intent": "general_chat" | "database_query" | "create_schema" | "create_table",
          "confidence": 0.0-1.0,
          "reasoning": "brief explanation of why you chose this intent",
          "requiresDatabase": true/false
        }
        
        Intent definitions:
        - "general_chat": Any conversational message, questions about concepts, greetings, thanks, etc.
        - "database_query": Questions about existing data (SELECT, INSERT, UPDATE, DELETE operations on existing tables)
        - "create_schema": Creating a new database with multiple tables
        - "create_table": Creating a single new table
        
        Guidelines:
        - If user is asking about data in a database, use "database_query"
        - If user wants to create a new database/schema, use "create_schema" 
        - If user wants to create a single table, use "create_table"
        - If user is just chatting, asking questions, or being conversational, use "general_chat"
        - Be liberal with "general_chat" - when in doubt, choose general chat
        - "requiresDatabase" should be true only for database_query intent
        
        IMPORTANT: Distinguish between INSERT and CREATE TABLE:
        - "Add a new [record]" when table exists → database_query (INSERT)
        - "Create a [table] table" → create_table (CREATE TABLE)
        - "Add [table] with [fields]" when table exists → database_query (INSERT)
        - "Create [table] with [fields]" → create_table (CREATE TABLE)
        - "Create a schema called X" → create_table (CREATE TABLE with name X)
        - "Create random tables" → create_table (CREATE TABLE)
        
        Examples:
        - "hello" → general_chat
        - "what is SQL?" → general_chat  
        - "show me all customers" → database_query
        - "add a new customer" → database_query (INSERT)
        - "create a users table" → create_table
        - "create a school database" → create_schema
        - "add a new album with title and artist" → database_query (INSERT)
        - "create an album table" → create_table
        - "create a schema called abedtest" → create_table
        - "create random tables" → create_table
        - "thanks" → general_chat
        - "looks good" → general_chat`
      },
      {
        role: "user",
        content: `User message: "${message}"
        
        Has database selected: ${hasDatabase}
        
        Classify the intent.`
      }
    ]
  });

  try {
    const response = completion.choices[0].message.content.trim();
    const intentData = JSON.parse(response);
    return intentData;
  } catch (error) {
    console.error('Error parsing intent:', error);
    // Fallback to general chat if parsing fails
    return {
      intent: "general_chat",
      confidence: 0.5,
      reasoning: "Failed to parse intent, defaulting to general chat",
      requiresDatabase: false
    };
  }
}

module.exports = { detectIntent };
