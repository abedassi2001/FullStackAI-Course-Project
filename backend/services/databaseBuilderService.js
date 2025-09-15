// backend/services/databaseBuilderService.js
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { initializeMySQL, isMySQLAvailable } = require("./sqliteToMysqlService");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Database Builder Service
 * Analyzes provided data and creates an optimal database structure
 */

// Parse different data formats
function parseDataInput(data, format = 'auto') {
  try {
    // Auto-detect format if not specified
    if (format === 'auto') {
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        format = 'json';
      } else if (data.includes(',') && data.includes('\n')) {
        format = 'csv';
      } else {
        format = 'text';
      }
    }

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.parse(data);
      
      case 'csv':
        return parseCSV(data);
      
      case 'text':
        return parseTextData(data);
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  } catch (error) {
    throw new Error(`Failed to parse data: ${error.message}`);
  }
}

// Parse CSV data
function parseCSV(csvData) {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      rows.push(row);
    }
  }
  
  return { headers, rows };
}

// Parse text data (extract structured information)
function parseTextData(textData) {
  // This will be enhanced by AI to extract structured data
  return { raw: textData };
}

// Use AI to analyze data and generate optimal database schema
async function generateDatabaseSchema(data, userDescription = '') {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `You are an expert database architect. Analyze the provided data and create an optimal database schema.

        Your task:
        1. Analyze the data structure and content
        2. Identify entities, relationships, and data types
        3. Generate normalized database schema with proper relationships
        4. Create appropriate indexes and constraints
        5. Suggest a meaningful database name

        Return a JSON object with this structure:
        {
          "databaseName": "suggested_database_name",
          "tables": [
            {
              "name": "table_name",
              "columns": [
                {
                  "name": "column_name",
                  "type": "VARCHAR(255) | INT | DECIMAL(10,2) | TEXT | DATE | TIMESTAMP",
                  "constraints": "PRIMARY KEY | AUTO_INCREMENT | NOT NULL | UNIQUE | FOREIGN KEY",
                  "description": "column purpose"
                }
              ],
              "description": "table purpose",
              "sampleData": [{"col1": "value1", "col2": "value2"}]
            }
          ],
          "relationships": [
            {
              "from": "table1.column",
              "to": "table2.column",
              "type": "one-to-many | many-to-many | one-to-one"
            }
          ],
          "indexes": [
            {
              "table": "table_name",
              "columns": ["column1", "column2"],
              "type": "INDEX | UNIQUE INDEX"
            }
          ]
        }

        Guidelines:
        - Use proper MySQL data types
        - Always include auto-incrementing primary keys
        - Normalize data to avoid redundancy
        - Create meaningful foreign key relationships
        - Add appropriate constraints (NOT NULL, UNIQUE, etc.)
        - Suggest indexes for frequently queried columns
        - Use descriptive table and column names
        - Include sample data for each table`
      },
      {
        role: "user",
        content: `Data to analyze:
        
        User Description: ${userDescription || 'No specific description provided'}
        
        Data:
        ${JSON.stringify(data, null, 2)}
        
        Please analyze this data and create an optimal database schema.`
      }
    ]
  });

  const response = completion.choices[0].message.content.trim();
  return JSON.parse(response);
}

// Generate SQL DDL from schema
function generateSQLFromSchema(schema) {
  let sql = `-- Database: ${schema.databaseName}\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n\n`;
  
  // Create database
  sql += `CREATE DATABASE IF NOT EXISTS \`${schema.databaseName}\`;\n`;
  sql += `USE \`${schema.databaseName}\`;\n\n`;
  
  // Create tables
  schema.tables.forEach(table => {
    sql += `-- Table: ${table.name}\n`;
    sql += `-- ${table.description}\n`;
    sql += `CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n`;
    
    const columnDefs = table.columns.map(col => {
      let def = `  \`${col.name}\` ${col.type}`;
      if (col.constraints) {
        def += ` ${col.constraints}`;
      }
      return def;
    });
    
    sql += columnDefs.join(',\n');
    sql += '\n);\n\n';
  });
  
  // Add foreign key constraints
  if (schema.relationships && schema.relationships.length > 0) {
    sql += `-- Foreign Key Constraints\n`;
    schema.relationships.forEach(rel => {
      sql += `ALTER TABLE \`${rel.from.split('.')[0]}\` ADD CONSTRAINT fk_${rel.from.split('.')[0]}_${rel.to.split('.')[0]} FOREIGN KEY (\`${rel.from.split('.')[1]}\`) REFERENCES \`${rel.to.split('.')[0]}\`(\`${rel.to.split('.')[1]}\`);\n`;
    });
    sql += '\n';
  }
  
  // Add indexes
  if (schema.indexes && schema.indexes.length > 0) {
    sql += `-- Indexes\n`;
    schema.indexes.forEach(index => {
      const indexName = `idx_${index.table}_${index.columns.join('_')}`;
      sql += `CREATE ${index.type} \`${indexName}\` ON \`${index.table}\` (\`${index.columns.join('`, `')}\`);\n`;
    });
    sql += '\n';
  }
  
  // Insert sample data
  schema.tables.forEach(table => {
    if (table.sampleData && table.sampleData.length > 0) {
      sql += `-- Sample data for ${table.name}\n`;
      table.sampleData.forEach(row => {
        const columns = Object.keys(row);
        const values = Object.values(row).map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v);
        sql += `INSERT INTO \`${table.name}\` (\`${columns.join('`, `')}\`) VALUES (${values.join(', ')});\n`;
      });
      sql += '\n';
    }
  });
  
  return sql;
}

// Create SQLite database file
async function createSQLiteDatabase(schema, userId) {
  const dbPath = path.join(__dirname, '..', 'uploads', `db_${userId}_${Date.now()}.db`);
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
      // Create tables
      schema.tables.forEach(table => {
        const columnDefs = table.columns.map(col => {
          let def = `\`${col.name}\` ${col.type}`;
          if (col.constraints) {
            def += ` ${col.constraints}`;
          }
          return def;
        }).join(', ');
        
        db.run(`CREATE TABLE IF NOT EXISTS \`${table.name}\` (${columnDefs})`);
      });
      
      // Insert sample data
      schema.tables.forEach(table => {
        if (table.sampleData && table.sampleData.length > 0) {
          const stmt = db.prepare(`INSERT INTO \`${table.name}\` (${table.columns.map(c => `\`${c.name}\``).join(', ')}) VALUES (${table.columns.map(() => '?').join(', ')})`);
          
          table.sampleData.forEach(row => {
            const values = table.columns.map(col => row[col.name] || null);
            stmt.run(values);
          });
          
          stmt.finalize();
        }
      });
    });
    
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          dbPath,
          filename: path.basename(dbPath),
          tableCount: schema.tables.length,
          totalRows: schema.tables.reduce((sum, table) => sum + (table.sampleData?.length || 0), 0)
        });
      }
    });
  });
}

// Create MySQL database
async function createMySQLDatabase(schema, userId) {
  if (!await isMySQLAvailable()) {
    throw new Error('MySQL is not available');
  }
  
  const { initializeMySQL } = require('./sqliteToMysqlService');
  await initializeMySQL();
  
  const pool = require('./sqliteToMysqlService').pool;
  const dbName = `user_${userId}_${schema.databaseName}_${Date.now()}`;
  
  try {
    // Create database
    await pool.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await pool.execute(`USE \`${dbName}\``);
    
    // Create tables
    for (const table of schema.tables) {
      const columnDefs = table.columns.map(col => {
        let def = `\`${col.name}\` ${col.type}`;
        if (col.constraints) {
          def += ` ${col.constraints}`;
        }
        return def;
      }).join(', ');
      
      await pool.execute(`CREATE TABLE IF NOT EXISTS \`${table.name}\` (${columnDefs})`);
    }
    
    // Insert sample data
    for (const table of schema.tables) {
      if (table.sampleData && table.sampleData.length > 0) {
        const columns = table.columns.map(c => `\`${c.name}\``).join(', ');
        const placeholders = table.columns.map(() => '?').join(', ');
        
        for (const row of table.sampleData) {
          const values = table.columns.map(col => row[col.name] || null);
          await pool.execute(`INSERT INTO \`${table.name}\` (${columns}) VALUES (${placeholders})`, values);
        }
      }
    }
    
    return {
      dbName,
      tableCount: schema.tables.length,
      totalRows: schema.tables.reduce((sum, table) => sum + (table.sampleData?.length || 0), 0)
    };
  } catch (error) {
    throw new Error(`Failed to create MySQL database: ${error.message}`);
  }
}

// Main function to build database from data
async function buildDatabaseFromData(data, userDescription, userId, format = 'auto', dbType = 'sqlite') {
  try {
    // Parse the input data
    const parsedData = parseDataInput(data, format);
    
    // Generate optimal schema using AI
    const schema = await generateDatabaseSchema(parsedData, userDescription);
    
    // Generate SQL DDL
    const sqlDDL = generateSQLFromSchema(schema);
    
    // Create the actual database
    let dbResult;
    if (dbType === 'mysql') {
      dbResult = await createMySQLDatabase(schema, userId);
    } else {
      dbResult = await createSQLiteDatabase(schema, userId);
    }
    
    return {
      success: true,
      schema,
      sqlDDL,
      database: dbResult,
      message: `Successfully created database with ${dbResult.tableCount} tables and ${dbResult.totalRows} sample rows`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  buildDatabaseFromData,
  parseDataInput,
  generateDatabaseSchema,
  generateSQLFromSchema
};
