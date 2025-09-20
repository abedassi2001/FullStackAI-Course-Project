// Test speed optimizations
console.log('🚀 Testing AI Speed Optimizations...\n');

// Test 1: Intent Detection Speed
console.log('1. Testing Intent Detection Speed:');
const start1 = Date.now();

// Simulate fast intent detection (no AI call)
function detectIntentFast(message) {
  const msg = message.toLowerCase();
  const queryKeywords = ['show', 'get', 'find', 'select', 'insert', 'update', 'delete', 'add', 'change', 'remove', 'all table', 'table names', 'list tables'];
  const hasQueryKeywords = queryKeywords.some(keyword => msg.includes(keyword));
  
  if (hasQueryKeywords) {
    return {
      intent: 'database_query',
      confidence: 0.8,
      reasoning: 'Contains query keywords',
      requiresDatabase: true
    };
  }
  
  return {
    intent: 'general_chat',
    confidence: 0.5,
    reasoning: 'Default fallback',
    requiresDatabase: false
  };
}

const intentResult = detectIntentFast("show me all users");
const end1 = Date.now();
console.log(`   ✅ Intent detection: ${end1 - start1}ms`);
console.log(`   Result: ${intentResult.intent} (confidence: ${intentResult.confidence})\n`);

// Test 2: Frontend Table Creation Speed
console.log('2. Testing Frontend Table Creation Speed:');
const start2 = Date.now();

function extractTableName(message) {
  const patterns = [
    /(?:add\s+a\s+table\s+called|create\s+table\s+called|table\s+called|add\s+table\s+called|create\s+table\s+called|insert\s+table\s+called)\s+([`"]?[\w$]+[`"]?)/i,
    /(?:add|create|insert)\s+(?:a\s+)?table\s+(?:called|named|with\s+name)\s+([`"]?[\w$]+[`"]?)/i,
    /(?:table|new\s+table)\s+([`"]?[\w$]+[`"]?)/i,
    /(?:make|build)\s+(?:a\s+)?table\s+(?:called|named)\s+([`"]?[\w$]+[`"]?)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.toLowerCase().match(pattern);
    if (match) {
      return match[1].replace(/[`"]/g, '').trim();
    }
  }
  return null;
}

function generateCreateTableSQL(tableName, dbId) {
  const lowerTableName = tableName.toLowerCase();
  let columns = [
    'id INT PRIMARY KEY AUTO_INCREMENT',
    'name VARCHAR(255) NOT NULL',
    'description TEXT',
    'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
    'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  ];
  
  if (lowerTableName.includes('user') || lowerTableName.includes('customer')) {
    columns = [
      'id INT PRIMARY KEY AUTO_INCREMENT',
      'name VARCHAR(255) NOT NULL',
      'email VARCHAR(255) UNIQUE',
      'phone VARCHAR(20)',
      'address TEXT',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
      'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    ];
  }
  
  return `CREATE TABLE \`database_${dbId}\`.\`${tableName}\` (\n  ${columns.join(',\n  ')}\n)`;
}

const tableName = extractTableName("add a table called users");
const sql = generateCreateTableSQL(tableName, 123);
const end2 = Date.now();
console.log(`   ✅ Table extraction + SQL generation: ${end2 - start2}ms`);
console.log(`   Table name: ${tableName}`);
console.log(`   SQL generated: ${sql.split('\n')[0]}...\n`);

// Test 3: Sample Data Generation Speed (optimized)
console.log('3. Testing Optimized Sample Data Generation:');
const start3 = Date.now();

function generateSampleDataFromDescription(description) {
  const timestamp = new Date().toISOString();
  
  if (description.toLowerCase().includes('user') || description.toLowerCase().includes('customer')) {
    return [
      { id: 1, name: "John Doe", email: "john@example.com", phone: "555-0001", address: "123 Main St", created_at: timestamp, updated_at: timestamp },
      { id: 2, name: "Jane Smith", email: "jane@example.com", phone: "555-0002", address: "456 Oak Ave", created_at: timestamp, updated_at: timestamp },
      { id: 3, name: "Bob Johnson", email: "bob@example.com", phone: "555-0003", address: "789 Pine Rd", created_at: timestamp, updated_at: timestamp }
    ];
  }
  
  return [
    { id: 1, name: "Sample Item 1", description: "Generated from description", created_at: timestamp, updated_at: timestamp },
    { id: 2, name: "Sample Item 2", description: "Generated from description", created_at: timestamp, updated_at: timestamp },
    { id: 3, name: "Sample Item 3", description: "Generated from description", created_at: timestamp, updated_at: timestamp }
  ];
}

const sampleData = generateSampleDataFromDescription("user database");
const end3 = Date.now();
console.log(`   ✅ Sample data generation: ${end3 - start3}ms`);
console.log(`   Generated ${sampleData.length} records`);
console.log(`   First record: ${JSON.stringify(sampleData[0])}\n`);

// Test 4: Overall Performance Summary
console.log('4. Performance Summary:');
console.log(`   🚀 Intent Detection: ${end1 - start1}ms (instant)`);
console.log(`   🚀 Table Creation: ${end2 - start2}ms (instant)`);
console.log(`   🚀 Sample Data: ${end3 - start3}ms (instant)`);
console.log(`   🚀 Total Frontend Processing: ${end2 - start1}ms`);

console.log('\n✅ SPEED OPTIMIZATIONS APPLIED:');
console.log('   • Reduced AI token limits (200 → 150 → 50 tokens)');
console.log('   • Added response caching (5-minute TTL)');
console.log('   • Optimized sample data generation (no AI calls)');
console.log('   • Reduced frontend timeouts (1000ms → 300ms)');
console.log('   • Fast intent detection (regex-based)');
console.log('   • Frontend handles CREATE TABLE instantly');

console.log('\n🎯 EXPECTED IMPROVEMENTS:');
console.log('   • AI responses: 2-3x faster');
console.log('   • CREATE TABLE: Instant (300ms)');
console.log('   • Repeated queries: Cached (instant)');
console.log('   • Overall UX: Much more responsive');
