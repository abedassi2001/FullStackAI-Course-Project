// backend/services/intentRouter.js
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple keyword-based intent detection for speed
function detectIntentFast(message) {
  const msg = message.toLowerCase();
  
  // Database query keywords
  const queryKeywords = ['show', 'get', 'find', 'select', 'insert', 'update', 'delete', 'add', 'change', 'remove'];
  const hasQueryKeywords = queryKeywords.some(keyword => msg.includes(keyword));
  
  // Create keywords
  const createKeywords = ['create', 'make', 'build', 'new table', 'new database', 'new schema'];
  const hasCreateKeywords = createKeywords.some(keyword => msg.includes(keyword));
  
  // General chat indicators
  const chatKeywords = ['hello', 'hi', 'thanks', 'thank you', 'help', 'what', 'how', 'why', 'explain'];
  const hasChatKeywords = chatKeywords.some(keyword => msg.includes(keyword));
  
  if (hasCreateKeywords) {
    return {
      intent: msg.includes('schema') || msg.includes('database') ? 'create_schema' : 'create_table',
      confidence: 0.9,
      reasoning: 'Contains create keywords',
      requiresDatabase: false
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
        content: `Classify intent. Return JSON: {"intent": "general_chat|database_query|create_schema|create_table", "confidence": 0.0-1.0, "requiresDatabase": true/false}`
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
  
  // If confidence is high enough, return fast result
  if (fastResult.confidence > 0.8) {
    return fastResult;
  }
  
  // Otherwise, use AI for complex cases
  return await detectIntentAI(message, hasDatabase);
}

module.exports = {
  detectIntent,
  detectIntentFast,
  detectIntentAI
};