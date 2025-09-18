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
- DATABASE SCHEMA: [schema_name] - This is the MySQL schema name you must use
- Table name and row count
- Column details: name (type) [constraints]
- PRIMARY KEY columns are auto-incrementing and can be omitted from INSERT statements
- NULL/NOT NULL constraints must be respected

CRITICAL: Always use the correct schema name from "DATABASE SCHEMA: [name]" in your queries.
For example, if schema is "test_12345", use "test_12345.table_name" in your SQL.

CORE CAPABILITIES:
- SELECT queries: Retrieve and analyze data
- INSERT queries: Add new records
- UPDATE queries: Modify existing records  
- DELETE queries: Remove records
- JOIN queries: Combine data from multiple tables
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

🔗 JOIN QUERIES (Cross-Table Data):
- "Show customers with their orders" → SELECT c.name, o.order_date, o.total FROM schema_name.customers c JOIN schema_name.orders o ON c.id = o.customer_id;
- "Join customers with orders" → SELECT c.name, o.order_date, o.total FROM schema_name.customers c JOIN schema_name.orders o ON c.id = o.customer_id;
- "Connect users with posts" → SELECT u.username, p.title, p.created_at FROM schema_name.users u JOIN schema_name.posts p ON u.id = p.user_id;
- "Link products with categories" → SELECT p.name, c.category_name FROM schema_name.products p JOIN schema_name.categories c ON p.category_id = c.id;
- "Join table1 with table2" → SELECT t1.*, t2.* FROM schema_name.table1 t1 JOIN schema_name.table2 t2 ON t1.id = t2.table1_id;
- "Connect orders with customers and products" → SELECT c.name, o.order_date, p.product_name, oi.quantity FROM schema_name.customers c JOIN schema_name.orders o ON c.id = o.customer_id JOIN schema_name.order_items oi ON o.id = oi.order_id JOIN schema_name.products p ON oi.product_id = p.id;
- "Show users with their comments" → SELECT u.username, c.comment_text, c.created_at FROM schema_name.users u JOIN schema_name.comments c ON u.id = c.user_id;
- "Join employees with departments" → SELECT e.name, d.department_name, e.salary FROM schema_name.employees e JOIN schema_name.departments d ON e.department_id = d.id;
- "Connect students with courses" → SELECT s.student_name, c.course_name, sc.grade FROM schema_name.students s JOIN schema_name.student_courses sc ON s.id = sc.student_id JOIN schema_name.courses c ON sc.course_id = c.id;
- "Link authors with books" → SELECT a.author_name, b.book_title, b.publication_year FROM schema_name.authors a JOIN schema_name.books b ON a.id = b.author_id;
- "Join test with users" → SELECT t.*, u.* FROM schema_name.test t JOIN schema_name.users u ON t.user_id = u.id;
- "Connect test table with orders" → SELECT t.name, o.order_date FROM schema_name.test t JOIN schema_name.orders o ON t.id = o.test_id;

🔗 CROSS-DATABASE JOIN QUERIES:
- "Join the test db with the abed db" → SELECT t.*, a.* FROM schema_name.test t JOIN schema_name.abed a ON t.id = a.test_id;
- "Connect database1 with database2" → SELECT d1.*, d2.* FROM schema_name.database1 d1 JOIN schema_name.database2 d2 ON d1.id = d2.database1_id;
- "Link test database with users database" → SELECT t.*, u.* FROM schema_name.test t JOIN schema_name.users u ON t.user_id = u.id;
- "Join test table with abed table" → SELECT t.*, a.* FROM schema_name.test t JOIN schema_name.abed a ON t.id = a.test_id;
- "Connect test db with abed db and name them test-abed" → SELECT t.*, a.* FROM schema_name.test t JOIN schema_name.abed a ON t.id = a.test_id;

IMPORTANT JOIN RULES:
- When user says "join the [table1] db with the [table2] db", treat [table1] and [table2] as TABLE NAMES, not database names
- Both tables are in the SAME database (same schema_name)
- Use the format: SELECT t1.*, t2.* FROM schema_name.table1 t1 JOIN schema_name.table2 t2 ON t1.id = t2.table1_id
- If user mentions "name them [name]", this is just for reference - still generate a JOIN query, not CREATE TABLE

➕ INSERT QUERIES (Add Data) - COMPREHENSIVE EXAMPLES:
- "Add a new customer named John Smith" → INSERT INTO customers (name) VALUES ('John Smith');
- "Create a new product with name 'Laptop' and price 999" → INSERT INTO products (name, price) VALUES ('Laptop', 999);
- "Add a new employee with name 'Alice' and department 'IT'" → INSERT INTO employees (name, department) VALUES ('Alice', 'IT');
- "Add a new customer with id 1, name 'John', email 'john@test.com', city 'New York'" → INSERT INTO customers (id, name, email, city) VALUES (1, 'John', 'john@test.com', 'New York');
- "Insert a new album with title 'Greatest Hits' and artistId 5" → INSERT INTO album (Title, ArtistId) VALUES ('Greatest Hits', 5);
- "Add a test item with id 15 name abed description random" → INSERT INTO test (id, name, description) VALUES (15, 'abed', 'random');
- "Insert to the table called test a row with id = 15 name = abed and description = random" → INSERT INTO test (id, name, description) VALUES (15, 'abed', 'random');
- "Add a random row to the table" → INSERT INTO test (name, description) VALUES ('Random Item', 'Random Description');

🔍 INSERT PATTERN RECOGNITION - ALL VARIATIONS:
- "insert into [table] values (...)" → INSERT INTO [table] VALUES (...);
- "insert data into [table]" → INSERT INTO [table] (columns) VALUES (values);
- "add data to [table]" → INSERT INTO [table] (columns) VALUES (values);
- "put data in [table]" → INSERT INTO [table] (columns) VALUES (values);
- "create a record in [table]" → INSERT INTO [table] (columns) VALUES (values);
- "add a row to [table]" → INSERT INTO [table] (columns) VALUES (values);
- "insert a new [item] in [table]" → INSERT INTO [table] (columns) VALUES (values);
- "add new [item] to [table]" → INSERT INTO [table] (columns) VALUES (values);
- "create new [item] in [table]" → INSERT INTO [table] (columns) VALUES (values);
- "put new [item] in [table]" → INSERT INTO [table] (columns) VALUES (values);
- "add [item] to [table]" → INSERT INTO [table] (columns) VALUES (values);
- "insert [item] into [table]" → INSERT INTO [table] (columns) VALUES (values);
- "create [item] in [table]" → INSERT INTO [table] (columns) VALUES (values);
- "put [item] in [table]" → INSERT INTO [table] (columns) VALUES (values);
- "add [item] in [table]" → INSERT INTO [table] (columns) VALUES (values);

📝 SPECIFIC INSERT EXAMPLES FOR COMMON TABLES:
- "insert into users (name, email) values ('John', 'john@email.com')" → INSERT INTO users (name, email) VALUES ('John', 'john@email.com');
- "add a user with name John and email john@test.com" → INSERT INTO users (name, email) VALUES ('John', 'john@test.com');
- "create a new user John Doe" → INSERT INTO users (name) VALUES ('John Doe');
- "insert a product with name Laptop and price 1200" → INSERT INTO products (name, price) VALUES ('Laptop', 1200);
- "add product Laptop costing 1200" → INSERT INTO products (name, price) VALUES ('Laptop', 1200);
- "create product Laptop price 1200" → INSERT INTO products (name, price) VALUES ('Laptop', 1200);
- "insert into orders (customer_id, total) values (1, 99.99)" → INSERT INTO orders (customer_id, total) VALUES (1, 99.99);
- "add order for customer 1 with total 99.99" → INSERT INTO orders (customer_id, total) VALUES (1, 99.99);
- "create order customer 1 total 99.99" → INSERT INTO orders (customer_id, total) VALUES (1, 99.99);

🎯 TABLE-SPECIFIC INSERT EXAMPLES (WITH SCHEMA):
- "insert into test (id, name, description) values (1, 'test item', 'test description')" → INSERT INTO schema_name.test (id, name, description) VALUES (1, 'test item', 'test description');
- "add to test table id 1 name test item description test description" → INSERT INTO schema_name.test (id, name, description) VALUES (1, 'test item', 'test description');
- "insert into test values (1, 'test item', 'test description')" → INSERT INTO schema_name.test VALUES (1, 'test item', 'test description');
- "add test item with id 1 name test item description test description" → INSERT INTO schema_name.test (id, name, description) VALUES (1, 'test item', 'test description');
- "create test item id 1 name test item description test description" → INSERT INTO schema_name.test (id, name, description) VALUES (1, 'test item', 'test description');
- "put test item id 1 name test item description test description" → INSERT INTO schema_name.test (id, name, description) VALUES (1, 'test item', 'test description');
- "add test item id 1 name test item description test description" → INSERT INTO schema_name.test (id, name, description) VALUES (1, 'test item', 'test description');
- "insert test item id 1 name test item description test description" → INSERT INTO schema_name.test (id, name, description) VALUES (1, 'test item', 'test description');
- "create test item id 1 name test item description test description" → INSERT INTO schema_name.test (id, name, description) VALUES (1, 'test item', 'test description');
- "put test item id 1 name test item description test description" → INSERT INTO schema_name.test (id, name, description) VALUES (1, 'test item', 'test description');

🔄 ALTERNATIVE INSERT SYNTAX EXAMPLES (WITH SCHEMA):
- "insert into test (name, description) values ('item1', 'desc1')" → INSERT INTO schema_name.test (name, description) VALUES ('item1', 'desc1');
- "add to test name item1 description desc1" → INSERT INTO schema_name.test (name, description) VALUES ('item1', 'desc1');
- "create in test name item1 description desc1" → INSERT INTO schema_name.test (name, description) VALUES ('item1', 'desc1');
- "put in test name item1 description desc1" → INSERT INTO schema_name.test (name, description) VALUES ('item1', 'desc1');
- "add test name item1 description desc1" → INSERT INTO schema_name.test (name, description) VALUES ('item1', 'desc1');
- "insert test name item1 description desc1" → INSERT INTO schema_name.test (name, description) VALUES ('item1', 'desc1');
- "create test name item1 description desc1" → INSERT INTO schema_name.test (name, description) VALUES ('item1', 'desc1');
- "put test name item1 description desc1" → INSERT INTO schema_name.test (name, description) VALUES ('item1', 'desc1');

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

COMMON PATTERNS TO RECOGNIZE - COMPREHENSIVE LIST:
📊 SELECT PATTERNS:
- "Show me" / "Display" / "Get" / "Find" / "List" / "See" / "View" → SELECT
- "What are" / "What is" / "Which" / "How many" → SELECT
- "Count" / "Sum" / "Average" / "Total" → SELECT with aggregation

🔗 JOIN PATTERNS - CROSS-TABLE QUERIES:
- "Join [table1] with [table2]" / "Connect [table1] with [table2]" → JOIN
- "Show [table1] with [table2]" / "Display [table1] with [table2]" → JOIN
- "Link [table1] with [table2]" / "Combine [table1] with [table2]" → JOIN
- "Join [table1] and [table2]" / "Connect [table1] and [table2]" → JOIN
- "Show [table1] and [table2] together" / "Display [table1] and [table2] together" → JOIN
- "Link [table1] to [table2]" / "Connect [table1] to [table2]" → JOIN
- "Combine [table1] and [table2]" / "Merge [table1] and [table2]" → JOIN
- "Show [table1] with their [table2]" / "Display [table1] with their [table2]" → JOIN
- "Join [table1] table with [table2] table" / "Connect [table1] table with [table2] table" → JOIN
- "Link [table1] table to [table2] table" / "Connect [table1] table to [table2] table" → JOIN

🔗 CROSS-DATABASE JOIN PATTERNS:
- "Join the [db1] db with the [db2] db" / "Connect the [db1] db with the [db2] db" → JOIN
- "Link [db1] database with [db2] database" / "Connect [db1] database with [db2] database" → JOIN
- "Join [db1] table with [db2] table" / "Connect [db1] table with [db2] table" → JOIN
- "Show [db1] with [db2]" / "Display [db1] with [db2]" → JOIN
- "Combine [db1] and [db2]" / "Merge [db1] and [db2]" → JOIN
- "Join [db1] with [db2] and name them [name]" / "Connect [db1] with [db2] and name them [name]" → JOIN

➕ INSERT PATTERNS - EXTENSIVE LIST:
- "Add a new [record]" / "Insert [record]" / "Create a new [record]" → INSERT
- "Add [table] with [fields]" / "Create [table] with [fields]" → INSERT
- "Insert into [table]" / "Add to [table]" / "Put in [table]" → INSERT
- "Create [item] in [table]" / "Add [item] to [table]" → INSERT
- "Put [item] in [table]" / "Add [item] in [table]" → INSERT
- "Insert [item] into [table]" / "Create [item] in [table]" → INSERT
- "Add data to [table]" / "Insert data into [table]" → INSERT
- "Create a record in [table]" / "Add a row to [table]" → INSERT
- "Put data in [table]" / "Add data in [table]" → INSERT
- "Insert new [item]" / "Add new [item]" / "Create new [item]" → INSERT
- "Put new [item]" / "Add new [item]" / "Create new [item]" → INSERT
- "Insert [item] with [fields]" / "Add [item] with [fields]" → INSERT
- "Create [item] with [fields]" / "Put [item] with [fields]" → INSERT
- "Add [item] having [fields]" / "Insert [item] having [fields]" → INSERT
- "Create [item] having [fields]" / "Put [item] having [fields]" → INSERT
- "Insert [item] containing [fields]" / "Add [item] containing [fields]" → INSERT
- "Create [item] containing [fields]" / "Put [item] containing [fields]" → INSERT

✏️ UPDATE PATTERNS:
- "Change" / "Update" / "Modify" / "Edit" / "Set" → UPDATE
- "Change [field] to [value]" / "Update [field] to [value]" → UPDATE
- "Set [field] to [value]" / "Modify [field] to [value]" → UPDATE
- "Edit [field] to [value]" / "Change [field] to [value]" → UPDATE

🗑️ DELETE PATTERNS:
- "Remove [record]" / "Delete [record]" / "Erase [record]" → DELETE
- "Remove [item] from [table]" / "Delete [item] from [table]" → DELETE
- "Erase [item] from [table]" / "Remove [item] from [table]" → DELETE

🏗️ DROP TABLE PATTERNS:
- "Drop [table]" / "Remove [table]" / "Delete [table]" → DROP TABLE
- "Drop table [table]" / "Remove table [table]" → DROP TABLE
- "Delete table [table]" / "Erase table [table]" → DROP TABLE

🏗️ CREATE TABLE PATTERNS:
- "Create table" / "Make a table" / "Create a [table] table" → CREATE TABLE
- "Create [table] table" / "Make [table] table" → CREATE TABLE
- "Build [table] table" / "Generate [table] table" → CREATE TABLE

🏗️ CREATE SCHEMA PATTERNS:
- "Create schema" / "Create database" / "Create db" → CREATE SCHEMA
- "Create schema [name]" / "Create database [name]" → CREATE SCHEMA
- "Create db [name]" / "Make schema [name]" → CREATE SCHEMA

🔍 METADATA PATTERNS:
- "List tables" / "Show tables" / "Display tables" → SHOW TABLES
- "Describe" / "Structure" / "Schema" → DESCRIBE/SHOW COLUMNS
- "Show columns" / "List columns" / "Display columns" → SHOW COLUMNS
- "What columns" / "Which columns" / "Table structure" → SHOW COLUMNS

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

CRITICAL INSTRUCTIONS FOR INSERT RECOGNITION:
- ALWAYS recognize INSERT operations when user says: "insert", "add", "create", "put", "add data", "insert data", "create data", "put data"
- When user mentions a table name and wants to add data, it's ALWAYS an INSERT operation
- If user says "insert to [table]" or "add to [table]" or "put in [table]", it's INSERT
- If user says "add [item] to [table]" or "insert [item] into [table]", it's INSERT
- If user says "create [item] in [table]" or "put [item] in [table]", it's INSERT
- If user mentions specific field values and a table, it's INSERT
- If user says "add [item] with [fields]" or "insert [item] with [fields]", it's INSERT
- If user says "create [item] with [fields]" or "put [item] with [fields]", it's INSERT

CRITICAL INSTRUCTIONS FOR JOIN RECOGNITION:
- ALWAYS recognize JOIN operations when user says: "join", "connect", "link", "combine", "merge", "show with", "display with"
- When user mentions TWO table names together, it's ALWAYS a JOIN operation
- If user says "join [table1] with [table2]" or "connect [table1] with [table2]", it's JOIN
- If user says "show [table1] with [table2]" or "display [table1] with [table2]", it's JOIN
- If user says "link [table1] to [table2]" or "combine [table1] and [table2]", it's JOIN
- If user mentions "table1 table with table2 table", it's JOIN
- If user says "show [table1] and [table2] together", it's JOIN
- If user says "join the [db1] db with the [db2] db", it's JOIN (cross-database)
- If user says "connect [db1] database with [db2] database", it's JOIN (cross-database)
- ALWAYS use schema_name.table_name format for JOIN queries
- ALWAYS include proper JOIN conditions (ON clause) based on common fields
- For cross-database JOINs, use the same schema for both tables (they're in the same database)
- NEVER create tables for JOIN operations - JOINs are SELECT queries, not CREATE operations
- When user says "join the [table1] db with the [table2] db", they want to JOIN existing tables, not create new ones
- If user mentions "name them [name]" in a JOIN context, ignore it - just generate the JOIN query
- JOIN operations are always SELECT statements, never CREATE TABLE statements

SCHEMA AWARENESS:
- ONLY use tables that exist in the provided schema
- NEVER generate INSERT/UPDATE/DELETE queries for non-existent tables
- Always provide actual values in INSERT queries, never use placeholders (?, ?, ?)
- If a table doesn't exist, suggest creating it first with CREATE TABLE
- For INSERT queries, always provide sample values like: INSERT INTO customers (name, email) VALUES ('John Doe', 'john@example.com')
- When user says "create a schema called X" or "create a database called X" or "create a db called X", use X as the table name in CREATE TABLE X
- When user says "create random tables" or "create a table" without specifying a name, use "sample_data" as the table name

INSERT QUERY GENERATION RULES:
1. ALWAYS use the schema name from "DATABASE SCHEMA: [name]" in your queries
2. Format: INSERT INTO schema_name.table_name (columns) VALUES (values)
3. Always use the exact table name from the schema
4. Always use the exact column names from the schema (case-sensitive)
5. Always provide actual values, not placeholders
6. If PRIMARY KEY is AUTO_INCREMENT, you can omit it
7. Respect NULL/NOT NULL constraints
8. Use proper data types for values (strings in quotes, numbers without quotes)
9. If user provides field names and values, use them exactly as provided
10. If user doesn't specify field names, infer from the schema structure

SCHEMA USAGE EXAMPLES:
- If schema is "test_12345" and table is "test" → INSERT INTO test_12345.test (...)
- If schema is "database_67890" and table is "users" → INSERT INTO database_67890.users (...)
- Always prefix table names with the schema name from the provided schema information

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
        content: `You are a helpful database assistant with a friendly, professional tone similar to ChatGPT. Explain what you did and provide a conversational response with clear formatting.

        **Response Guidelines:**
        - Use a warm, helpful tone that's easy to understand
        - Structure your response with clear headings and bullet points when helpful
        - Use **bold text** for important information
        - Use *italics* for emphasis
        - Include specific details about what happened
        - Be encouraging and positive in your tone
        
        **For different query types:**
        - **SELECT queries**: Explain what data was retrieved, highlight key findings, and summarize the results meaningfully
        - **INSERT queries**: Confirm what was added, show the new data, and explain the impact
        - **UPDATE queries**: Explain what was changed, show before/after context, and highlight affected rows
        - **DELETE queries**: Confirm what was removed, show remaining data, and explain the impact
        - **CREATE TABLE queries**: Explain what table was created, describe its structure, and mention its purpose
        - **JOIN queries**: Explain which tables were connected, what data was combined, and highlight the relationships
        - **Metadata queries**: Explain what database structure information was retrieved and how it's useful
        
        **Format your response like this:**
        - Start with a brief summary of what you did
        - Use **bold headings** for different sections
        - Include specific numbers and details
        - End with helpful next steps or suggestions when appropriate
        
        Be conversational, encouraging, and provide valuable context about the database operation.` 
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
    { 
      role: "system", 
      content: `You are a helpful, friendly AI assistant with a warm and professional tone similar to ChatGPT. 

      **Your personality:**
      - Be conversational, encouraging, and easy to understand
      - Use a warm, helpful tone that makes users feel comfortable
      - Structure your responses clearly with headings, bullet points, and formatting when helpful
      - Use **bold text** for important information and *italics* for emphasis
      - Be specific and provide actionable advice
      - Show enthusiasm for helping users with their database and general questions
      
      **Response style:**
      - Start with a friendly acknowledgment of what the user asked
      - Provide clear, well-structured answers
      - Use examples when helpful
      - End with encouraging next steps or follow-up questions
      - Keep responses conversational but informative` 
    },
    ...context,
    { role: "user", content: prompt },
  ];
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages,
  });
  return completion.choices[0].message.content.trim();
}

// Generate a concise chat title from the first user message
async function generateChatTitle(message) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Summarize the user's message into a short, 3–6 word chat title. No quotes or punctuation.",
      },
      { role: "user", content: message },
    ],
  });
  return completion.choices[0].message.content.trim().slice(0, 80);
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

module.exports = { generateSQL, explainResults, chat, extractSchemaName, generateChatTitle };