// backend/services/intentRouter.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple keyword-based intent detection for speed
function detectIntentFast(message) {
  const msg = message.toLowerCase();
  
  // Database query keywords - enhanced for INSERT recognition
  const queryKeywords = ['show', 'get', 'find', 'select', 'insert', 'update', 'delete', 'add', 'change', 'remove', 'all table', 'table names', 'list tables'];
  const insertKeywords = ['insert', 'add', 'create', 'put', 'insert into', 'add to', 'put in', 'add data', 'insert data', 'create data', 'put data', 'add new', 'insert new', 'create new', 'put new', 'add item', 'insert item', 'create item', 'put item'];
  const joinKeywords = ['join', 'connect', 'link', 'combine', 'merge', 'show with', 'display with', 'together', 'with their', 'and their', 'table with', 'table to', 'db with', 'database with', 'join the', 'connect the', 'link the'];
  const hasQueryKeywords = queryKeywords.some(keyword => msg.includes(keyword));
  const hasInsertKeywords = insertKeywords.some(keyword => msg.includes(keyword));
  const hasJoinKeywords = joinKeywords.some(keyword => msg.includes(keyword));
  
  // Create keywords (removed table creation keywords)
  const createKeywords = ['create', 'make', 'build', 'new database', 'new schema', 'random db', 'random database', 'random schema', 'random scheme'];
  const hasCreateKeywords = createKeywords.some(keyword => msg.includes(keyword));
  
  // General chat indicators
  const chatKeywords = ['hello', 'hi', 'thanks', 'thank you', 'help', 'what', 'how', 'why', 'explain'];
  const hasChatKeywords = chatKeywords.some(keyword => msg.includes(keyword));
  
  if (hasCreateKeywords) {
    // Check for random database/schema creation
    if (msg.includes('random') && (msg.includes('db') || msg.includes('database') || msg.includes('schema') || msg.includes('scheme'))) {
      return {
        intent: 'create_random_database',
        confidence: 0.95,
        reasoning: 'Contains random database creation keywords',
        requiresDatabase: false
      };
    }
    
    
    // Check for specific database/schema creation with details
    if (msg.includes('database') || msg.includes('schema') || msg.includes('db')) {
      return {
        intent: 'create_schema',
        confidence: 0.9,
        reasoning: 'Contains database/schema creation keywords',
        requiresDatabase: false
      };
    }
    
    // Default to table creation
    return {
      intent: 'create_table',
      confidence: 0.8,
      reasoning: 'Contains create keywords',
      requiresDatabase: false
    };
  }
  
  // Check for INSERT operations first (highest priority)
  if (hasInsertKeywords) {
    return {
      intent: 'database_query',
      confidence: 0.95,
      reasoning: 'Contains INSERT operation keywords',
      requiresDatabase: true
    };
  }
  
  // Check for JOIN operations (high priority)
  if (hasJoinKeywords) {
    return {
      intent: 'database_query',
      confidence: 0.9,
      reasoning: 'Contains JOIN operation keywords',
      requiresDatabase: true
    };
  }
  
  if (hasQueryKeywords) {
    return {
      intent: 'database_query',
      confidence: 0.8,
      reasoning: 'Contains query keywords',
      requiresDatabase: true
    };
  }
  
  if (hasChatKeywords || msg.length < 20) {
    return {
      intent: 'general_chat',
      confidence: 0.7,
      reasoning: 'Contains chat keywords or short message',
      requiresDatabase: false
    };
  }
  
  // Default to general chat for safety
  return {
    intent: 'general_chat',
    confidence: 0.5,
    reasoning: 'Default fallback',
    requiresDatabase: false
  };
}

/**
 * Intelligent intent detection using AI (fallback for complex cases)
 */
async function detectIntentAI(message, hasDatabase = false) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 150, // Reduced for speed
    messages: [
      {
        role: "system",
        content: `Classify intent. Return JSON: {"intent": "general_chat|database_query|create_schema|create_random_database", "confidence": 0.0-1.0, "requiresDatabase": true/false}

RULES:
- "create random db/database/schema" → create_random_database
- "create database/schema for [description]" → create_schema  
- "insert/add/put data into [table]" → database_query (INSERT operation)
- "add [item] to [table]" → database_query (INSERT operation)
- "insert [item] into [table]" → database_query (INSERT operation)
- "create [item] in [table]" → database_query (INSERT operation)
- "put [item] in [table]" → database_query (INSERT operation)
- "add new [item]" → database_query (INSERT operation)
- "insert new [item]" → database_query (INSERT operation)
- "create new [item]" → database_query (INSERT operation)
- "put new [item]" → database_query (INSERT operation)
- "join [table1] with [table2]" → database_query (JOIN operation)
- "connect [table1] with [table2]" → database_query (JOIN operation)
- "link [table1] with [table2]" → database_query (JOIN operation)
- "combine [table1] and [table2]" → database_query (JOIN operation)
- "show [table1] with [table2]" → database_query (JOIN operation)
- "display [table1] with [table2]" → database_query (JOIN operation)
- "join the [db1] db with the [db2] db" → database_query (JOIN operation)
- "connect [db1] database with [db2] database" → database_query (JOIN operation)
- "link [db1] with [db2]" → database_query (JOIN operation)
- "show/get/find [data]" → database_query
- General conversation → general_chat

IMPORTANT: Any mention of adding, inserting, creating, or putting data/items into an existing table should be classified as database_query (INSERT operation). Any mention of joining, connecting, linking, or combining two tables should be classified as database_query (JOIN operation).`
      },
      { role: "user", content: message },
    ],
  });
  
  try {
    return JSON.parse(completion.choices[0].message.content.trim());
  } catch (error) {
    return detectIntentFast(message);
  }
}

/**
 * Main intent detection function - uses fast detection first, AI as fallback
 */
async function detectIntent(message, hasDatabase = false) {
  // Try fast detection first
  const fastResult = detectIntentFast(message);
  
  // Always use fast result for create_random_database to avoid AI override
  if (fastResult.intent === 'create_random_database') {
    return fastResult;
  }
  
  // If confidence is high enough, return fast result
  if (fastResult.confidence > 0.8) {
    return fastResult;
  }
  
  // Otherwise, use AI for complex cases
  try {
    return await detectIntentAI(message, hasDatabase);
  } catch (error) {
    console.error('AI intent detection failed, using fast result:', error.message);
    return fastResult;
  }
}

module.exports = {
  detectIntent,
  detectIntentFast,
  detectIntentAI
};