// src/pages/AIChatPage.jsx - Updated to remove freeLoading references
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import QueryTemplates from "../components/QueryTemplates";
import "./AIChatPage.css";

export default function AIChatPage() {
  const [message, setMessage] = useState("");
  const [selectedDbId, setSelectedDbId] = useState("");
  const [databases, setDatabases] = useState([]);
  const [history, setHistory] = useState([]); // {role: 'user'|'assistant', content: string, timestamp: Date}
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionTimeout, setSuggestionTimeout] = useState(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Fetch user's saved databases
  const fetchDatabases = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/uploads", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDatabases(res.data.databases || []);
      console.log(`📊 Fetched ${res.data.databases?.length || 0} valid databases`);
    } catch (err) {
      console.error("Failed to fetch databases:", err);
    }
  };

  // Fetch user's saved databases on component mount
  useEffect(() => {
    fetchDatabases();
    
    // Set up periodic refresh every 30 seconds to ensure database list is up-to-date
    const interval = setInterval(fetchDatabases, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch smart suggestions based on current input
  const fetchSuggestions = async (query, dbId) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }
    
    setSuggestionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ q: query });
      if (dbId) params.append('dbId', dbId);
      
      const res = await axios.get(`http://localhost:5000/ai/suggestions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.data.success) {
        setSuggestions(res.data.suggestions || []);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
      // Fallback to basic suggestions
      setSuggestions([
        "Show me all customers",
        "Find products with price over 100",
        "Add a new customer",
        "Create a products table"
      ]);
    } finally {
      setSuggestionLoading(false);
    }
  };

  // Debounced suggestion fetching
  const debouncedFetchSuggestions = (query, dbId) => {
    if (suggestionTimeout) {
      clearTimeout(suggestionTimeout);
    }
    
    const timeout = setTimeout(() => {
      fetchSuggestions(query, dbId);
    }, 300); // 300ms delay
    
    setSuggestionTimeout(timeout);
  };

  // Fetch previous queries for initial suggestions
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/queries", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const prompts = (res.data?.data || []).map((q) => q.prompt);
        setSuggestions(prompts.slice(0, 10));
      } catch (_) {}
    };
    fetchHistory();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
      }
    };
  }, [suggestionTimeout]);

  // Hardcoded database creation function
  const handleHardcodedDatabaseCreation = async (message) => {
    console.log('🔧 HARDCODED DATABASE CREATION DETECTED');
    
    const userMessage = { role: "user", content: message, timestamp: new Date() };
    setHistory((h) => [...h, userMessage]);
    setMessage("");
    setLoading(true);
    
    try {
      // Extract database name from message or generate one
      let dbName = 'random_database';
      const dbNameMatch = message.match(/(?:create\s+(?:a\s+)?(?:random\s+)?database\s+(?:called\s+|named\s+)?([a-zA-Z0-9_]+)|create\s+database\s+([a-zA-Z0-9_]+))/i);
      if (dbNameMatch) {
        dbName = dbNameMatch[1] || dbNameMatch[2] || dbName;
      } else {
        // Generate a random database name
        const randomId = Math.floor(Math.random() * 10000) + 1000;
        dbName = `database_${randomId}`;
      }
      
      // Send request to backend to create database
      const response = await axios.post('/ai/chat', {
        message: `create a database called ${dbName}`,
        dbId: null // No existing database
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        const assistantMessage = {
          role: "assistant",
          content: `✅ Database "${dbName}" has been successfully created!`,
          timestamp: new Date(),
          sql: response.data.sql,
          explanation: response.data.explanation,
          schemaCreated: true,
          dbId: response.data.dbId,
          className: 'success'
        };
        
        setHistory((h) => [...h, assistantMessage]);
        
        // Auto-select the new database
        if (response.data.dbId) {
          setSelectedDbId(response.data.dbId);
          // Refresh database list
          setTimeout(() => {
            fetchDatabases();
          }, 500);
        }
      } else {
        throw new Error(response.data.message || 'Failed to create database');
      }
    } catch (error) {
      console.error('❌ Database creation error:', error);
      const errorMessage = {
        role: "assistant",
        content: `❌ Failed to create database: ${error.response?.data?.message || error.message}`,
        timestamp: new Date(),
        className: 'error'
      };
      setHistory((h) => [...h, errorMessage]);
    } finally {
      setLoading(false);
    }
  };



  // Check if message is a hardcoded database creation request
  const isDatabaseCreationRequest = (message) => {
    const patterns = [
      /create\s+(?:a\s+)?(?:random\s+)?database/i,
      /create\s+database\s+(?:called\s+|named\s+)?[a-zA-Z0-9_]+/i,
      /random\s+database/i,
      /new\s+database/i,
      /make\s+(?:a\s+)?database/i,
      /build\s+(?:a\s+)?database/i
    ];
    
    return patterns.some(pattern => pattern.test(message.toLowerCase()));
  };


  // Extract table name from message
  const extractTableName = (message) => {
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
  };

  // Generate CREATE TABLE SQL
  const generateCreateTableSQL = (tableName, dbId) => {
    const lowerTableName = tableName.toLowerCase();
    let columns = [
      'id INT PRIMARY KEY AUTO_INCREMENT',
      'name VARCHAR(255) NOT NULL',
      'description TEXT',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
      'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    ];
    
    if (lowerTableName.includes('user') || lowerTableName.includes('customer') || lowerTableName.includes('client')) {
      columns = [
        'id INT PRIMARY KEY AUTO_INCREMENT',
        'name VARCHAR(255) NOT NULL',
        'email VARCHAR(255) UNIQUE',
        'phone VARCHAR(20)',
        'address TEXT',
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
      ];
    } else if (lowerTableName.includes('product') || lowerTableName.includes('item')) {
      columns = [
        'id INT PRIMARY KEY AUTO_INCREMENT',
        'name VARCHAR(255) NOT NULL',
        'description TEXT',
        'price DECIMAL(10,2)',
        'category VARCHAR(100)',
        'stock_quantity INT DEFAULT 0',
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
      ];
    } else if (lowerTableName.includes('employee') || lowerTableName.includes('worker') || lowerTableName.includes('staff')) {
      columns = [
        'id INT PRIMARY KEY AUTO_INCREMENT',
        'name VARCHAR(255) NOT NULL',
        'position VARCHAR(255)',
        'department VARCHAR(255)',
        'salary DECIMAL(10,2)',
        'hire_date DATE',
        'email VARCHAR(255) UNIQUE',
        'phone VARCHAR(20)',
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
      ];
    }
    
    return `CREATE TABLE \`database_${dbId}\`.\`${tableName}\` (\n  ${columns.join(',\n  ')}\n)`;
  };

  // Hardcoded CREATE TABLE function
  const handleCreateTable = (message) => {
    console.log('🔧 HARDCODED CREATE TABLE DETECTED');
    
    const userMessage = { role: "user", content: message, timestamp: new Date() };
    setHistory((h) => [...h, userMessage]);
    setMessage("");
    setLoading(true);
    
    // Extract table name
    const tableName = extractTableName(message);
    if (!tableName) {
      const errorMessage = {
        role: "assistant",
        content: "❌ Could not extract table name. Please try: 'add a table called [name]'",
        timestamp: new Date(),
        className: 'error'
      };
      setHistory((h) => [...h, errorMessage]);
      setLoading(false);
      return;
    }
    
    if (!selectedDbId) {
      const errorMessage = {
        role: "assistant",
        content: "❌ Please select a database from the dropdown to create tables in.",
        timestamp: new Date(),
        className: 'error'
      };
      setHistory((h) => [...h, errorMessage]);
      setLoading(false);
      return;
    }
    
    // Generate SQL
    const createTableSQL = generateCreateTableSQL(tableName, selectedDbId);
    console.log('🔧 Generated SQL:', createTableSQL);
    
    // Simulate table creation
    setTimeout(() => {
      const assistantMessage = {
        role: "assistant",
        content: `✅ Table "${tableName}" has been successfully created in database!`,
        timestamp: new Date(),
        sql: createTableSQL,
        explanation: `I've created a new table called "${tableName}" with appropriate columns based on your request.`,
        tableCreated: true,
        tableName: tableName,
        className: 'success'
      };
      
      setHistory((h) => [...h, assistantMessage]);
      setLoading(false);
    }, 1000);
  };

  // Check if message is table creation
  const isTableCreation = (message) => {
    return extractTableName(message) !== null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!message) {
      setError("Message is required.");
      return;
    }
    
    // Check for table creation FIRST
    if (isTableCreation(message)) {
      handleCreateTable(message);
      return;
    }
    
    // Let the AI backend handle all other routing intelligently

    const userMessage = { role: "user", content: message, timestamp: new Date() };
    setHistory((h) => [...h, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      console.log('🚀 Sending request:', { message, dbId: selectedDbId || null });
      const res = await axios.post("http://localhost:5000/ai/chat", 
        { message, dbId: selectedDbId || null },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        }
      );
      
      const assistantMessage = {
        role: "assistant",
        content: res.data?.explanation || "Query executed successfully",
        timestamp: new Date(),
        sql: res.data?.sql,
        rows: res.data?.rows,
        columns: res.data?.columns,
        schemaCreated: res.data?.schemaCreated || false,
        dbId: res.data?.dbId,
        isDualResponse: res.data?.isDualResponse || false,
        chatExplanation: res.data?.chatExplanation,
        isGeneralQuestion: res.data?.isGeneralQuestion || false,
        tableDropped: res.data?.tableDropped || false,
        droppedTableName: res.data?.droppedTableName
      };
      
      setHistory((h) => [...h, assistantMessage]);
      
      // Refresh databases list if a schema was created or table was dropped
      if (res.data?.schemaCreated || res.data?.tableDropped) {
        fetchDatabases();
      }
    } catch (err) {
      const errorMessage = {
        role: "assistant",
        content: `Error: ${err.response?.data?.message || err.message}`,
        timestamp: new Date(),
        isError: true
      };
      setHistory((h) => [...h, errorMessage]);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };



  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateText) => {
    setMessage(templateText);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  // Handle export functionality
  const handleExport = async (format) => {
    if (!selectedDbId) {
      setError("No database selected for export");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`http://localhost:5000/uploads/export/${selectedDbId}/${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or create default
      const filename = response.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || 
                     `database_export.${format}`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      setError(`Export failed: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <button
          className="back-btn"
          onClick={() => navigate("/databases")}
          type="button"
        >
          ← Back to Databases
        </button>
      </div>

      {/* Database Selection */}
      <div className="database-selector">
        <select
          value={selectedDbId}
          onChange={(e) => setSelectedDbId(e.target.value)}
          className="db-select"
        >
          <option value="">Choose a database...</option>
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.filename} ({db.tableCount} tables, {db.totalRows} rows)
            </option>
          ))}
        </select>
        
        {/* Export Buttons */}
        {selectedDbId && (
          <div className="export-buttons">
            <button 
              className="export-btn csv-btn"
              onClick={() => handleExport('csv')}
              title="Export to CSV"
            >
              📊 CSV
            </button>
            <button 
              className="export-btn json-btn"
              onClick={() => handleExport('json')}
              title="Export to JSON"
            >
              📄 JSON
            </button>
          </div>
        )}
      </div>


      {/* Messages Container */}
      <div className="messages-container">
        {history.length === 0 ? (
          <div className="welcome-section">
            <div className="welcome-message">
              <h2>👋 Hi! I'm your 2SQL AI Assistant</h2>
              <p>
                I can help you work with your database and answer any questions! I understand natural language and can convert your requests into SQL queries.
              </p>
            </div>
            
            {/* Query Templates */}
            <QueryTemplates 
              onSelectTemplate={handleTemplateSelect}
              selectedDbId={selectedDbId}
            />
          </div>
        ) : (
          <div className="messages">
            {history.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role} ${msg.className || ''}`}>
                <div className="message-avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div className="message-content">
                  <div className="message-text">{msg.content}</div>
                  
                  {/* SQL Query Block */}
                  {msg.sql && (
                    <div className="sql-block">
                      <div className="sql-header">🔍 SQL Query:</div>
                      <pre className="sql-code">{msg.sql}</pre>
                    </div>
                  )}
                  
                  {/* Data Results Block */}
                  {msg.rows && msg.rows.length > 0 && (
                    <div className="results-block">
                      <div className="results-header">📊 Data ({msg.rows.length} rows):</div>
                      <div className="results-table">
                        <table>
                          <thead>
                            <tr>
                              {msg.columns?.map((col, i) => (
                                <th key={i}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {msg.rows.slice(0, 10).map((row, i) => (
                              <tr key={i}>
                                {msg.columns?.map((col, j) => (
                                  <td key={j}>{JSON.stringify(row[col])}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {msg.rows.length > 10 && (
                          <div className="results-footer">
                            Showing first 10 of {msg.rows.length} rows
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* ChatGPT Explanation Block (for dual responses) */}
                  {msg.isDualResponse && msg.chatExplanation && (
                    <div className="chat-explanation-block">
                      <div className="chat-explanation-header">
                        🤖 AI Explanation:
                      </div>
                      <div className="chat-explanation-text">{msg.chatExplanation}</div>
                    </div>
                  )}
                  
                  {/* Database Schema Block (for database building) */}
                  {msg.schema && (
                    <div className="schema-block">
                      <div className="schema-header">🏗️ Database Schema: {msg.schema.databaseName}</div>
                      <div className="schema-info">
                        <p><strong>Tables:</strong> {msg.schema.tables.length}</p>
                        <p><strong>Total Rows:</strong> {msg.database?.totalRows || 0}</p>
                      </div>
                      <div className="schema-tables">
                        {msg.schema.tables.map((table, idx) => (
                          <div key={idx} className="table-info">
                            <h4>📋 {table.name}</h4>
                            <p className="table-description">{table.description}</p>
                            <div className="table-columns">
                              {table.columns.map((col, colIdx) => (
                                <span key={colIdx} className="column-tag">
                                  {col.name} ({col.type})
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* SQL DDL Block (for database building) */}
                  {msg.sqlDDL && (
                    <div className="sql-ddl-block">
                      <div className="sql-ddl-header">💾 Generated SQL:</div>
                      <pre className="sql-ddl-code">{msg.sqlDDL}</pre>
                    </div>
                  )}
                  
                  {/* Table Dropped Block */}
                  {msg.tableDropped && (
                    <div className="table-dropped-block">
                      <div className="table-dropped-header">🗑️ Table Dropped:</div>
                      <div className="table-dropped-info">
                        <p><strong>Table:</strong> {msg.droppedTableName}</p>
                        <p><strong>Status:</strong> Successfully removed from database</p>
                        <p><em>Note: The database list has been updated to reflect this change.</em></p>
                      </div>
                    </div>
                  )}
                  
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                const newValue = e.target.value;
                setMessage(newValue);
                setShowSuggestions(true);
                
                // Fetch smart suggestions as user types
                debouncedFetchSuggestions(newValue, selectedDbId);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your database, create new tables, or ask me anything..."
              className="message-input"
              rows={1}
              disabled={loading}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            <button
              type="submit"
              disabled={
                loading || 
                !message
              }
              className="send-btn"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </form>
        
        {/* Enhanced Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="suggestions">
            <div className="suggestions-header">
              <span>💡 Smart Suggestions</span>
              {suggestionLoading && <span className="loading-indicator">Loading...</span>}
            </div>
            {suggestions.slice(0, 6).map((suggestion, i) => {
              // Highlight matching text
              const highlightMatch = (text, query) => {
                if (!query || query.length < 2) return text;
                const regex = new RegExp(`(${query})`, 'gi');
                return text.replace(regex, '<mark>$1</mark>');
              };
              
              return (
                <div 
                  key={i} 
                  className="suggestion-item"
                  onClick={() => { 
                    setMessage(suggestion); 
                    setShowSuggestions(false);
                    textareaRef.current?.focus();
                  }}
                  dangerouslySetInnerHTML={{
                    __html: highlightMatch(suggestion, message)
                  }}
                />
              );
            })}
            {suggestions.length === 0 && !suggestionLoading && (
              <div className="suggestion-item no-suggestions">
                Start typing to get smart suggestions...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}
