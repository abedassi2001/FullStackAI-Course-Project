// backend/test-schema-name-fix.js
// Test script to verify schema name extraction and usage

const { extractSchemaName } = require('./services/aiService');

async function testSchemaNameExtraction() {
  console.log('🧪 Testing Schema Name Extraction...\n');
  
  const testCases = [
    {
      input: "create a schema called my_database",
      expected: "my_database"
    },
    {
      input: "create schema test123",
      expected: "test123"
    },
    {
      input: "create database called 'user_data'",
      expected: "user_data"
    },
    {
      input: "create db called 'user_data'",
      expected: "user_data"
    },
    {
      input: "create a db named test",
      expected: "test"
    },
    {
      input: "make a db called myapp",
      expected: "myapp"
    },
    {
      input: "make a schema named products_db",
      expected: "products_db"
    },
    {
      input: "build a database with name inventory",
      expected: "inventory"
    },
    {
      input: "create random tables",
      expected: null
    },
    {
      input: "create a table",
      expected: null
    },
    {
      input: "show me all customers",
      expected: null
    }
  ];
  
  console.log('Testing schema name extraction:');
  console.log('================================');
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📝 Input: "${testCase.input}"`);
      const extracted = await extractSchemaName(testCase.input);
      console.log(`🔍 Extracted: "${extracted}"`);
      console.log(`✅ Expected: "${testCase.expected}"`);
      
      if (extracted === testCase.expected) {
        console.log('✅ PASS');
      } else {
        console.log('❌ FAIL - Names do not match');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Schema Name Extraction Test Complete!');
}

// Run the test
if (require.main === module) {
  testSchemaNameExtraction().catch(console.error);
}

module.exports = { testSchemaNameExtraction };
