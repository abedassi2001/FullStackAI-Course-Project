// backend/controllers/exportController.js
const { executeQueryOnUserDb } = require('../services/sqliteToMysqlService');

function getUid(req) {
  return req.user?.id || req.user?._id || null;
}

// Export database to CSV or JSON
exports.exportDatabase = async (req, res) => {
  try {
    const uid = getUid(req);
    if (!uid) return res.status(401).json({ success: false, error: "Unauthorized" });

    const { dbId, format } = req.params;
    if (!dbId || !format) {
      return res.status(400).json({ success: false, error: "Database ID and format are required" });
    }

    if (!['csv', 'json'].includes(format.toLowerCase())) {
      return res.status(400).json({ success: false, error: "Format must be 'csv' or 'json'" });
    }

    console.log(`🔄 Exporting database ${dbId} to ${format.toUpperCase()} for user ${uid}`);

    // Get all tables for this database
    const { pool } = require('../utils/mysql.db');
    const [rows] = await pool.execute(
      `SELECT mysql_schema_name FROM user_databases WHERE id = ? AND user_id = ?`,
      [dbId, String(uid)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Database not found" });
    }

    const schemaName = rows[0].mysql_schema_name;

    // Get all tables in the schema
    const [tables] = await pool.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [schemaName]
    );

    if (tables.length === 0) {
      return res.status(404).json({ success: false, error: "No tables found in database" });
    }

    // Export all tables
    const exportData = {};
    let csvContent = '';
    let jsonContent = '';

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`📊 Exporting table: ${tableName}`);

      // Get table data
      const [data] = await pool.execute(`SELECT * FROM \`${schemaName}\`.\`${tableName}\``);
      
      if (format.toLowerCase() === 'json') {
        exportData[tableName] = data;
      } else {
        // CSV format
        if (data.length > 0) {
          const columns = Object.keys(data[0]);
          csvContent += `\n--- Table: ${tableName} ---\n`;
          csvContent += columns.join(',') + '\n';
          
          data.forEach(row => {
            csvContent += columns.map(col => {
              const value = row[col];
              // Escape CSV values
              if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }).join(',') + '\n';
          });
        }
      }
    }

    // Set response headers
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `database_export_${timestamp}.${format}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format.toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      jsonContent = JSON.stringify(exportData, null, 2);
      res.send(jsonContent);
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.send(csvContent);
    }

    console.log(`✅ Database exported successfully: ${filename}`);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Export failed' 
    });
  }
};
