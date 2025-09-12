// backend/services/querySuggestionsService.js
const queryService = require('./queryService');

// Common query templates and patterns
const QUERY_TEMPLATES = {
  // Data Retrieval Patterns
  SELECT: [
    "Show me all {table}",
    "Find {table} where {condition}",
    "Get {count} {table} ordered by {column}",
    "Show {table} with {column} greater than {value}",
    "Count how many {table} have {condition}",
    "Find the average {column} in {table}",
    "Show me the top {number} {table} by {column}",
    "Get all {table} from {location}",
    "Find {table} created between {date1} and {date2}",
    "Show {table} grouped by {column}"
  ],
  
  // Data Insertion Patterns
  INSERT: [
    "Add a new {table} with {fields}",
    "Insert a new {table} record",
    "Add {data} to {table}",
    "Create a new {table} entry",
    "Insert {count} new {table} records"
  ],
  
  // Data Update Patterns
  UPDATE: [
    "Change {field} to {value} where {condition}",
    "Update {table} set {field} = {value}",
    "Modify {table} where {condition}",
    "Set {field} to {value} for {condition}",
    "Change all {table} {field} to {value}"
  ],
  
  // Data Deletion Patterns
  DELETE: [
    "Remove {table} where {condition}",
    "Delete {table} with {field} = {value}",
    "Remove all {table} from {location}",
    "Delete {table} created before {date}",
    "Remove {table} where {field} is null"
  ],
  
  // Table Creation Patterns
  CREATE_TABLE: [
    "Create a {table} table with {fields}",
    "Make a {table} table for {purpose}",
    "Create table {table} with columns {columns}",
    "Build a {table} table with {field1}, {field2}, and {field3}",
    "Create a {table} schema with {description}"
  ],
  
  // Metadata Patterns
  METADATA: [
    "Show me all tables",
    "Describe the {table} table",
    "What columns are in {table}?",
    "List all databases",
    "Show table structure for {table}",
    "What's the schema of {table}?"
  ],
  
  // Analysis Patterns
  ANALYSIS: [
    "Which {table} has the most {metric}?",
    "What's the trend in {field} over time?",
    "Compare {field1} vs {field2}",
    "Find the correlation between {field1} and {field2}",
    "What are the top {number} {category}?",
    "Show me the distribution of {field}",
    "Find outliers in {table}",
    "What's the average {field} by {group}?"
  ]
};

// Common table names and fields for suggestions
const COMMON_ENTITIES = {
  tables: [
    "customers", "users", "products", "orders", "employees", 
    "inventory", "sales", "transactions", "categories", "departments",
    "suppliers", "payments", "invoices", "items", "accounts"
  ],
  
  fields: [
    "name", "email", "id", "date", "price", "quantity", "status",
    "created_at", "updated_at", "description", "category", "type",
    "amount", "total", "count", "average", "sum", "max", "min"
  ],
  
  conditions: [
    "name = '{value}'", "id = {number}", "price > {value}",
    "date >= '{date}'", "status = 'active'", "category = '{name}'",
    "email LIKE '%{domain}%'", "created_at > '{date}'"
  ],
  
  locations: [
    "New York", "California", "Texas", "Florida", "London",
    "Paris", "Tokyo", "Berlin", "Miami", "Chicago"
  ]
};

// Generate smart suggestions based on user input
function generateSmartSuggestions(input, userHistory = []) {
  const suggestions = new Set();
  const lowerInput = input.toLowerCase();
  
  // If input is empty or very short, return common starters
  if (input.length < 2) {
    return [
      "Show me all customers",
      "Find products with price over 100",
      "Add a new customer",
      "Create a products table",
      "Show me all tables"
    ];
  }
  
  // Extract potential table names from input
  const potentialTables = COMMON_ENTITIES.tables.filter(table => 
    lowerInput.includes(table) || table.includes(lowerInput)
  );
  
  // Extract potential fields from input
  const potentialFields = COMMON_ENTITIES.fields.filter(field =>
    lowerInput.includes(field) || field.includes(lowerInput)
  );
  
  // Generate suggestions based on input patterns
  if (lowerInput.includes('show') || lowerInput.includes('display') || lowerInput.includes('get')) {
    // SELECT suggestions
    QUERY_TEMPLATES.SELECT.forEach(template => {
      if (potentialTables.length > 0) {
        suggestions.add(template.replace('{table}', potentialTables[0]));
      }
      suggestions.add(template);
    });
  }
  
  if (lowerInput.includes('add') || lowerInput.includes('create') || lowerInput.includes('insert')) {
    // INSERT suggestions
    QUERY_TEMPLATES.INSERT.forEach(template => {
      if (potentialTables.length > 0) {
        suggestions.add(template.replace('{table}', potentialTables[0]));
      }
      suggestions.add(template);
    });
  }
  
  if (lowerInput.includes('change') || lowerInput.includes('update') || lowerInput.includes('modify')) {
    // UPDATE suggestions
    QUERY_TEMPLATES.UPDATE.forEach(template => {
      if (potentialTables.length > 0 && potentialFields.length > 0) {
        suggestions.add(template
          .replace('{table}', potentialTables[0])
          .replace('{field}', potentialFields[0])
        );
      }
      suggestions.add(template);
    });
  }
  
  if (lowerInput.includes('remove') || lowerInput.includes('delete')) {
    // DELETE suggestions
    QUERY_TEMPLATES.DELETE.forEach(template => {
      if (potentialTables.length > 0) {
        suggestions.add(template.replace('{table}', potentialTables[0]));
      }
      suggestions.add(template);
    });
  }
  
  if (lowerInput.includes('table') && (lowerInput.includes('create') || lowerInput.includes('make'))) {
    // CREATE TABLE suggestions
    QUERY_TEMPLATES.CREATE_TABLE.forEach(template => {
      if (potentialTables.length > 0) {
        suggestions.add(template.replace('{table}', potentialTables[0]));
      }
      suggestions.add(template);
    });
  }
  
  // Add user history suggestions that match the input
  userHistory.forEach(historyItem => {
    if (historyItem.toLowerCase().includes(lowerInput) || lowerInput.includes(historyItem.toLowerCase())) {
      suggestions.add(historyItem);
    }
  });
  
  // Add common analysis patterns
  if (lowerInput.includes('which') || lowerInput.includes('what') || lowerInput.includes('how')) {
    QUERY_TEMPLATES.ANALYSIS.forEach(template => {
      if (potentialTables.length > 0 && potentialFields.length > 0) {
        suggestions.add(template
          .replace('{table}', potentialTables[0])
          .replace('{field}', potentialFields[0])
        );
      }
      suggestions.add(template);
    });
  }
  
  // Convert to array and limit results
  return Array.from(suggestions).slice(0, 8);
}

// Get contextual suggestions based on database schema
function getContextualSuggestions(schemaInfo, input = '') {
  const suggestions = [];
  
  if (!schemaInfo || !schemaInfo.tables) {
    return generateSmartSuggestions(input);
  }
  
  const tables = schemaInfo.tables;
  const lowerInput = input.toLowerCase();
  
  // Generate suggestions based on actual table names
  tables.forEach(table => {
    const tableName = table.name;
    const columns = table.columns || [];
    
    // SELECT suggestions for this table
    suggestions.push(`Show me all ${tableName}`);
    suggestions.push(`Find ${tableName} where id = 1`);
    
    // Add column-specific suggestions
    if (columns.length > 0) {
      const firstColumn = columns[0].name;
      suggestions.push(`Get ${tableName} ordered by ${firstColumn}`);
      
      // If there are common field types, add specific suggestions
      columns.forEach(col => {
        if (col.name.toLowerCase().includes('name')) {
          suggestions.push(`Find ${tableName} where ${col.name} = 'John'`);
        }
        if (col.name.toLowerCase().includes('price') || col.name.toLowerCase().includes('amount')) {
          suggestions.push(`Show ${tableName} with ${col.name} > 100`);
        }
        if (col.name.toLowerCase().includes('date') || col.name.toLowerCase().includes('created')) {
          suggestions.push(`Find ${tableName} created after '2023-01-01'`);
        }
      });
    }
    
    // INSERT suggestions
    const columnNames = columns.map(col => col.name).join(', ');
    if (columnNames) {
      suggestions.push(`Add a new ${tableName} with ${columnNames}`);
    }
    
    // UPDATE suggestions
    if (columns.length > 0) {
      const firstColumn = columns[0].name;
      suggestions.push(`Update ${tableName} set ${firstColumn} = 'new value'`);
    }
  });
  
  // Add metadata suggestions
  suggestions.push("Show me all tables");
  suggestions.push("Describe the database structure");
  
  return suggestions.slice(0, 10);
}

// Get real-time suggestions as user types
async function getRealtimeSuggestions(input, userId, schemaInfo = null) {
  try {
    // Get user's query history
    const userHistory = await queryService.getAllQueries();
    const userPrompts = userHistory
      .filter(q => q.userId === userId)
      .map(q => q.prompt)
      .slice(0, 20);
    
    // Generate suggestions
    let suggestions = [];
    
    if (schemaInfo) {
      suggestions = getContextualSuggestions(schemaInfo, input);
    } else {
      suggestions = generateSmartSuggestions(input, userPrompts);
    }
    
    // Filter suggestions based on input
    if (input.length > 0) {
      const lowerInput = input.toLowerCase();
      suggestions = suggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(lowerInput) || 
        lowerInput.includes(suggestion.toLowerCase())
      );
    }
    
    return suggestions.slice(0, 6);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return generateSmartSuggestions(input);
  }
}

module.exports = {
  generateSmartSuggestions,
  getContextualSuggestions,
  getRealtimeSuggestions,
  QUERY_TEMPLATES,
  COMMON_ENTITIES
};
