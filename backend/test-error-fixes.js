// backend/test-error-fixes.js
// Test the error fixes

const { generateSQL } = require('./services/aiService');

async function testErrorFixes() {
  console.log('🧪 Testing Error Fixes...\n');
  
  const testCases = [
    {
      prompt: "Add a new customer with id, name, email, city",
      schema: "Table: customers (id, name, email, city)",
      expectedSQL: "INSERT INTO customers",
      shouldHaveValues: true
    },
    {
      prompt: "Add a new category called Electronics",
      schema: "Table: customers (id, name, email, city)",
      expectedSQL: "CREATE TABLE",
      shouldHaveValues: false
    },
    {
      prompt: "Insert into categories table",
      schema: "Table: customers (id, name, email, city)",
      expectedSQL: "CREATE TABLE",
      shouldHaveValues: false
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase.prompt}"`);
    console.log(`📊 Schema: ${testCase.schema}`);
    console.log('─'.repeat(60));
    
    try {
      const sql = await generateSQL(testCase.prompt, testCase.schema, 1);
      console.log(`🔍 Generated SQL: ${sql}`);
      
      // Check if SQL matches expectation
      const sqlMatch = sql.toUpperCase().includes(testCase.expectedSQL.toUpperCase()) ? '✅' : '❌';
      console.log(`${sqlMatch} SQL Type: ${sqlMatch === '✅' ? 'Correct' : 'Incorrect'}`);
      
      // Check for placeholders
      const hasPlaceholders = sql.includes('?');
      const placeholderCheck = hasPlaceholders ? '❌' : '✅';
      console.log(`${placeholderCheck} No Placeholders: ${placeholderCheck === '✅' ? 'Good' : 'Bad - has placeholders'}`);
      
      // Check for actual values
      const hasValues = sql.includes("'") || sql.includes('"') || /\d+/.test(sql);
      const valueCheck = testCase.shouldHaveValues ? (hasValues ? '✅' : '❌') : '✅';
      console.log(`${valueCheck} Has Values: ${valueCheck === '✅' ? 'Good' : 'Bad - missing values'}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Error Fix Test Complete!');
}

// Run the test
if (require.main === module) {
  testErrorFixes().catch(console.error);
}

module.exports = { testErrorFixes };
