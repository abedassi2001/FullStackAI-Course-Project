// backend/test-insert-fix.js
// Test the INSERT vs CREATE TABLE fix

const { generateSQL } = require('./services/aiService');
const { detectIntent } = require('./services/intentRouter');

async function testInsertFix() {
  console.log('🧪 Testing INSERT vs CREATE TABLE Fix...\n');
  
  const testCases = [
    {
      prompt: "Add a new Album with AlbumId, Title, ArtistId",
      expectedIntent: "database_query",
      expectedSQL: "INSERT"
    },
    {
      prompt: "Create an album table with AlbumId, Title, ArtistId", 
      expectedIntent: "create_table",
      expectedSQL: "CREATE TABLE"
    },
    {
      prompt: "Add a new customer named John",
      expectedIntent: "database_query", 
      expectedSQL: "INSERT"
    },
    {
      prompt: "Create a customer table",
      expectedIntent: "create_table",
      expectedSQL: "CREATE TABLE"
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase.prompt}"`);
    console.log('─'.repeat(50));
    
    try {
      // Test intent detection
      const intent = await detectIntent(testCase.prompt, true);
      console.log(`🎯 Intent: ${intent.intent} (expected: ${testCase.expectedIntent})`);
      console.log(`💭 Reasoning: ${intent.reasoning}`);
      
      // Test SQL generation
      const sql = await generateSQL(testCase.prompt, "Table: album (AlbumId, Title, ArtistId)", 1);
      console.log(`🔍 Generated SQL: ${sql}`);
      
      // Check if SQL matches expectation
      const sqlType = sql.toUpperCase().includes(testCase.expectedSQL) ? '✅' : '❌';
      console.log(`${sqlType} SQL Type: ${sqlType === '✅' ? 'Correct' : 'Incorrect'}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Test Complete!');
}

// Run the test
if (require.main === module) {
  testInsertFix().catch(console.error);
}

module.exports = { testInsertFix };
