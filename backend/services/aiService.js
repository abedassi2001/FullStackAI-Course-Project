const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ask AI for SQL (supports SELECT, INSERT, UPDATE, DELETE, CREATE TABLE)
async function generateSQL(prompt, schemaText, userId) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are an expert SQL assistant that converts natural language to MySQL queries. 

SCHEMA UNDERSTANDING:
The provided schema shows tables with their columns and constraints. Each table entry shows:
- Table name and row count
- Column details: name (type) [constraints]
- PRIMARY KEY columns are auto-incrementing and can be omitted from INSERT statements
- NULL/NOT NULL constraints must be respected

CORE CAPABILITIES:
- SELECT queries: Retrieve and analyze data
- INSERT queries: Add new records
- UPDATE queries: Modify existing records  
- DELETE queries: Remove records
- CREATE TABLE queries: Create new tables
- DROP TABLE queries: Remove tables
- Metadata queries: Show database structure

QUERY EXAMPLES BY CATEGORY:

📊 SELECT QUERIES (Data Retrieval):
- "Show me all customers" → SELECT * FROM customers;
- "Find customers from New York" → SELECT * FROM customers WHERE city = 'New York';
- "Get top 5 customers by total orders" → SELECT customer_name, COUNT(*) as total_orders FROM orders GROUP BY customer_name ORDER BY total_orders DESC LIMIT 5;
- "Show average salary by department" → SELECT department, AVG(salary) as avg_salary FROM employees GROUP BY department;
- "Find products with price over 100" → SELECT * FROM products WHERE price > 100;
- "Count how many orders each customer made" → SELECT customer_id, COUNT(*) as order_count FROM orders GROUP BY customer_id;

➕ INSERT QUERIES (Add Data):
- "Add a new customer named John Smith" → INSERT INTO customers (name) VALUES ('John Smith');
- "Create a new product with name 'Laptop' and price 999" → INSERT INTO products (name, price) VALUES ('Laptop', 999);
- "Add a new employee with name 'Alice' and department 'IT'" → INSERT INTO employees (name, department) VALUES ('Alice', 'IT');
- "Add a new customer with id 1, name 'John', email 'john@test.com', city 'New York'" → INSERT INTO customers (id, name, email, city) VALUES (1, 'John', 'john@test.com', 'New York');
- "Insert a new album with title 'Greatest Hits' and artistId 5" → INSERT INTO album (Title, ArtistId) VALUES ('Greatest Hits', 5);
- "Add a test item with id 15 name abed description random" → INSERT INTO test (id, name, description) VALUES (15, 'abed', 'random');
- "Insert to the table called test a row with id = 15 name = abed and description = random" → INSERT INTO test (id, name, description) VALUES (15, 'abed', 'random');
- "Add a random row to the table" → INSERT INTO test (name, description) VALUES ('Random Item', 'Random Description');

✏️ UPDATE QUERIES (Modify Data):
- "Change John's city to Los Angeles" → UPDATE customers SET city = 'Los Angeles' WHERE name = 'John';
- "Update product price to 1200 where name is 'Laptop'" → UPDATE products SET price = 1200 WHERE name = 'Laptop';
- "Set all employees in IT department salary to 80000" → UPDATE employees SET salary = 80000 WHERE department = 'IT';

🗑️ DELETE QUERIES (Remove Data):
- "Remove customer with email john@test.com" → DELETE FROM customers WHERE email = 'john@test.com';
- "Delete all products with price less than 50" → DELETE FROM products WHERE price < 50;
- "Remove employees from the old department" → DELETE FROM employees WHERE department = 'old department';

🗑️ DROP TABLE QUERIES (Remove Tables):
- "Drop the customers table" → DROP TABLE customers;
- "Remove the products table" → DROP TABLE products;
- "Delete the old_orders table" → DROP TABLE old_orders;
- "Drop table if exists temp_data" → DROP TABLE IF EXISTS temp_data;

🏗️ CREATE TABLE QUERIES (Database Structure):
- "Create a users table with name, email, and created_at" → CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), email VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
- "Create a products table with name, price, and category" → CREATE TABLE products (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), price DECIMAL(10,2), category VARCHAR(100));
- "Create an orders table with customer_id and order_date" → CREATE TABLE orders (id INT PRIMARY KEY AUTO_INCREMENT, customer_id INT, order_date DATE, FOREIGN KEY (customer_id) REFERENCES customers(id));
- "Create a schema called X" → CREATE TABLE X (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
- "Create random tables" → CREATE TABLE sample_data (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

🔍 METADATA QUERIES (Database Info):
- "Show me all tables" → SHOW TABLES;
- "Describe the customers table" → DESCRIBE customers;
- "What columns are in the products table?" → SHOW COLUMNS FROM products;
- "List all databases" → SHOW DATABASES;

IMPORTANT RULES:
1. Always use WHERE clauses for UPDATE and DELETE to prevent mass changes
2. Use proper MySQL data types: INT, VARCHAR(255), DECIMAL(10,2), TIMESTAMP, DATE
3. For CREATE TABLE, always include an auto-incrementing primary key
4. Use proper foreign key constraints when creating related tables
5. Return ONLY the SQL query, no explanations or markdown formatting
6. Use MySQL syntax, not SQLite
7. ONLY use tables that exist in the provided schema - never create INSERT/UPDATE/DELETE queries for non-existent tables
8. For INSERT queries, provide actual values instead of placeholders (?, ?, ?)
9. When inserting data, use the exact column names from the schema (case-sensitive)
10. For INSERT queries, only include columns that exist in the table schema
11. If a column is PRIMARY KEY and AUTO_INCREMENT, you can omit it from INSERT statements
12. Pay attention to NULL/NOT NULL constraints when inserting data

COMMON PATTERNS TO RECOGNIZE:
- "Show me" / "Display" / "Get" / "Find" → SELECT
- "Add a new [record]" / "Insert [record]" / "Create a new [record]" → INSERT (when table exists)
- "Add [table] with [fields]" / "Create [table] with [fields]" → INSERT (when table exists)
- "Change" / "Update" / "Modify" → UPDATE
- "Remove [record]" / "Delete [record]" → DELETE
- "Drop [table]" / "Remove [table]" / "Delete [table]" → DROP TABLE
- "Create table" / "Make a table" / "Create a [table] table" → CREATE TABLE
- "Create schema" / "Create database" / "Create db" → CREATE SCHEMA (for schema creation)
- "List tables" / "Show tables" → SHOW TABLES
- "Describe" / "Structure" → DESCRIBE/SHOW COLUMNS

IMPORTANT DISTINCTION:
- "Add a new Album" (when album table exists) → INSERT INTO album (Title, ArtistId) VALUES (?, ?)
- "Create an album table" → CREATE TABLE album (...)
- "Add a new customer" (when customer table exists) → INSERT INTO customer (...)
- "Create a customer table" → CREATE TABLE customer (...)
- "Create a schema called X" → CREATE SCHEMA X
- "Create a database called X" → CREATE SCHEMA X
- "Create a db called X" → CREATE SCHEMA X
- "Create random tables" → CREATE TABLE sample_data (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

COMPOUND REQUESTS:
- "Create a schema called X and add an item" → CREATE TABLE X (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- "Create random tables then add data" → CREATE TABLE sample_data (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(255), description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

CRITICAL: 
- ONLY use tables that exist in the provided schema
- NEVER generate INSERT/UPDATE/DELETE queries for non-existent tables
- Always provide actual values in INSERT queries, never use placeholders (?, ?, ?)
- If a table doesn't exist, suggest creating it first with CREATE TABLE
- For INSERT queries, always provide sample values like: INSERT INTO customers (name, email) VALUES ('John Doe', 'john@example.com')
- When user says "create a schema called X" or "create a database called X" or "create a db called X", use X as the table name in CREATE TABLE X
- When user says "create random tables" or "create a table" without specifying a name, use "sample_data" as the table name

Return ONLY the SQL query, no explanations.`
      },
      {
        role: "user",
        content: `DATABASE SCHEMA:\n${schemaText}\n\nUSER REQUEST: ${prompt}\n\nGenerate the appropriate SQL query:`,
      },
    ],
  });

  let sql = completion.choices[0].message.content.trim();
  sql = sql.replace(/```sql/gi, "").replace(/```/g, "").trim();
  return sql;
}

// Explain results and provide conversational response
async function explainResults(prompt, sql, rows, operationType = 'SELECT') {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      { 
        role: "system", 
        content: `You are a helpful database assistant. Explain what you did and provide a conversational response. 
        
        For SELECT queries: Explain what data was retrieved and summarize the results.
        For INSERT queries: Confirm what was added and show the new data.
        For UPDATE queries: Explain what was changed and show the affected rows.
        For DELETE queries: Confirm what was removed and show remaining data.
        For CREATE TABLE queries: Explain what table was created and its structure.
        For metadata queries (SHOW TABLES, DESCRIBE, etc.): Explain what database structure information was retrieved.
        
        Be conversational, helpful, and provide context about the database operation.` 
      },
      { 
        role: "user", 
        content: `User asked: "${prompt}"
        
SQL executed: ${sql}
Operation type: ${operationType}
Results: ${JSON.stringify(rows).slice(0, 6000)}

Please explain what happened and provide a helpful response.` 
      },
    ],
  });
  return completion.choices[0].message.content.trim();
}

// Add a simple general chat helper
async function chat(prompt, context = []) {
  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    ...context,
    { role: "user", content: prompt },
  ];
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    messages,
  });
  return completion.choices[0].message.content.trim();
}

// Extract schema name from user request
async function extractSchemaName(prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `You are a schema name extractor. Extract the schema/database name from user requests.

        Look for patterns like:
        - "create a schema called X"
        - "create schema X" 
        - "create database X"
        - "create a database called X"
        - "create db X"
        - "create a db called X"
        - "make a schema named X"
        - "build a database with name X"
        - "make a db named X"

        Return ONLY the extracted name, or "null" if no specific name is mentioned.
        Clean the name by removing quotes, special characters, and keeping only alphanumeric characters and underscores.

        Examples:
        - "create a schema called my_database" → "my_database"
        - "create schema test123" → "test123"
        - "create database called 'user_data'" → "user_data"
        - "create db called 'user_data'" → "user_data"
        - "create a db named test" → "test"
        - "make a db called myapp" → "myapp"
        - "create random tables" → "null"
        - "create a table" → "null"`
      },
      {
        role: "user",
        content: `Extract schema name from: "${prompt}"`
      }
    ],
  });

  const extractedName = completion.choices[0].message.content.trim();
  return extractedName === "null" ? null : extractedName;
}

module.exports = { generateSQL, explainResults, chat, extractSchemaName };