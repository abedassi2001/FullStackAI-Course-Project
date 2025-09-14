// backend/test-schema-fix.js
// Test the schema creation fix

const { generateSQL } = require('./services/aiService');
const { detectIntent } = require('./services/intentRouter');

async function testSchemaFix() {
  console.log('🧪 Testing Schema Creation Fix...\n');
  
  const testCases = [
    {
      prompt: "create a schema called abedtest and random tabels to it then add an item",
      expectedIntent: "create_table",
      expectedSQL: "CREATE TABLE abedtest"
    },
    {
      prompt: "create a schema called test123", 
      expectedIntent: "create_table",
      expectedSQL: "CREATE TABLE test123"
    },
    {
      prompt: "create random tables",
      expectedIntent: "create_table",
      expectedSQL: "CREATE TABLE sample_data"
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase.prompt}"`);
    console.log('─'.repeat(60));
    
    try {
      // Test intent detection
      const intent = await detectIntent(testCase.prompt, true);
      console.log(`🎯 Intent: ${intent.intent} (expected: ${testCase.expectedIntent})`);
      console.log(`💭 Reasoning: ${intent.reasoning}`);
      
      // Test SQL generation
      const sql = await generateSQL(testCase.prompt, "No existing schema", 1);
      console.log(`🔍 Generated SQL: ${sql}`);
      
      // Check if SQL matches expectation
      const sqlMatch = sql.toUpperCase().includes(testCase.expectedSQL.toUpperCase()) ? '✅' : '❌';
      console.log(`${sqlMatch} SQL Match: ${sqlMatch === '✅' ? 'Correct' : 'Incorrect'}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Schema Fix Test Complete!');
}

// Run the test
if (require.main === module) {
  testSchemaFix().catch(console.error);
}

module.exports = { testSchemaFix };
