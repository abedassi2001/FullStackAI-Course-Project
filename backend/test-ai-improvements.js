// backend/test-ai-improvements.js
// Simple test script to verify AI improvements

const { generateSQL } = require('./services/aiService');
const { getRealtimeSuggestions } = require('./services/querySuggestionsService');

async function testAIImprovements() {
  console.log('🧪 Testing AI Improvements...\n');
  
  // Test 1: Enhanced AI prompts
  console.log('1. Testing Enhanced AI Prompts:');
  console.log('================================');
  
  const testPrompts = [
    "Show me all customers",
    "Find products with price over 100",
    "Add a new customer named John Smith",
    "Create a products table with name and price",
    "Update customer city to New York where id = 1",
    "Remove customer with email test@example.com"
  ];
  
  for (const prompt of testPrompts) {
    try {
      console.log(`\n📝 Prompt: "${prompt}"`);
      const sql = await generateSQL(prompt, "Table: customers (id, name, email, city)", 1);
      console.log(`✅ Generated SQL: ${sql}`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  // Test 2: Smart suggestions
  console.log('\n\n2. Testing Smart Suggestions:');
  console.log('==============================');
  
  const testQueries = [
    "show",
    "find customers",
    "add new",
    "create table",
    "update",
    "delete"
  ];
  
  for (const query of testQueries) {
    try {
      console.log(`\n🔍 Query: "${query}"`);
      const suggestions = await getRealtimeSuggestions(query, 1, null);
      console.log(`💡 Suggestions: ${suggestions.slice(0, 3).join(', ')}...`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ AI Improvements Test Complete!');
}

// Run the test
if (require.main === module) {
  testAIImprovements().catch(console.error);
}

module.exports = { testAIImprovements };
