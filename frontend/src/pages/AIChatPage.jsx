// src/pages/AIChatPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AIChatPage.css";

export default function AIChatPage() {
  const [message, setMessage] = useState("");
  const [selectedDbId, setSelectedDbId] = useState("");
  const [databases, setDatabases] = useState([]);
  // const [response, setResponse] = useState(null); // Removed unused variable
  const [history, setHistory] = useState([]); // {role: 'user'|'assistant', content: string, timestamp: Date}
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [freeTalk, setFreeTalk] = useState("");
  const [freeLoading, setFreeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatMode, setChatMode] = useState("database"); // "database" or "free"
  const [isCreatingSchema, setIsCreatingSchema] = useState(false);
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
    } catch (err) {
      console.error("Failed to fetch databases:", err);
    }
  };

  // Fetch user's saved databases on component mount
  useEffect(() => {
    fetchDatabases();
  }, []);

  // Fetch previous queries for suggestions
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Check if this is a schema creation request
    const lowerMessage = message.toLowerCase();
    
    // Only treat as schema creation if:
    // 1. Checkbox is checked, OR
    // 2. Message explicitly mentions creating/building/making a schema, OR
    // 3. Message contains schema creation keywords but NOT query keywords
    const hasSchemaCreationKeywords = lowerMessage.includes('create schema') || 
                                     lowerMessage.includes('create a schema') ||
                                     lowerMessage.includes('make a schema') ||
                                     lowerMessage.includes('build a schema') ||
                                     lowerMessage.includes('design a schema') ||
                                     lowerMessage.includes('create random schema') ||
                                     lowerMessage.includes('generate schema') ||
                                     lowerMessage.includes('new schema');
    
    const hasQueryKeywords = lowerMessage.includes('show') || 
                            lowerMessage.includes('select') || 
                            lowerMessage.includes('get') || 
                            lowerMessage.includes('find') || 
                            lowerMessage.includes('list') ||
                            lowerMessage.includes('display') ||
                            lowerMessage.includes('query');
    
    const isSchemaRequest = isCreatingSchema || 
                           (hasSchemaCreationKeywords && !hasQueryKeywords);

    console.log('Message:', message);
    console.log('Is creating schema checkbox:', isCreatingSchema);
    console.log('Has schema creation keywords:', hasSchemaCreationKeywords);
    console.log('Has query keywords:', hasQueryKeywords);
    console.log('Is schema request:', isSchemaRequest);

    if (isSchemaRequest) {
      // Handle schema creation
      const userMessage = { role: "user", content: message, timestamp: new Date() };
      setHistory((h) => [...h, userMessage]);
      setMessage("");
      setLoading(true);

      try {
        console.log('Sending schema creation request...');
        const token = localStorage.getItem("token");
        const res = await axios.post("http://localhost:5000/ai/create-schema", 
          { description: message },
          {
            headers: { 
              "Content-Type": "application/json", 
              Authorization: `Bearer ${token}` 
            }
          }
        );
        
        console.log('Schema creation response:', res.data);
        
        const assistantMessage = { 
          role: "assistant", 
          content: res.data.message, 
          timestamp: new Date(),
          schemaCreated: true,
          dbId: res.data.dbId
        };
        setHistory((h) => [...h, assistantMessage]);
        
        // Refresh databases list
        fetchDatabases();
      } catch (err) {
        console.error('Schema creation error:', err);
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
      return;
    }

    // Regular database query
    if (!message) {
      setError("Message is required.");
      return;
    }
    
    if (!selectedDbId && !isCreatingSchema) {
      setError("Please select a database to query, or check 'Create Schema' to create a new database.");
      return;
    }

    const userMessage = { role: "user", content: message, timestamp: new Date() };
    setHistory((h) => [...h, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:5000/ai/chat", 
        { message, dbId: selectedDbId },
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
        columns: res.data?.columns
      };
      
      setHistory((h) => [...h, assistantMessage]);
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

  const sendFreeTalk = async (e) => {
    e.preventDefault();
    if (!freeTalk || freeLoading) return;
    
    const userMessage = { role: "user", content: freeTalk, timestamp: new Date() };
    setHistory((h) => [...h, userMessage]);
    setFreeTalk("");
    setFreeLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/ai/talk",
        { message: freeTalk, history },
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      const reply = res.data?.reply || "";
      const assistantMessage = { role: "assistant", content: reply, timestamp: new Date() };
      setHistory((h) => [...h, assistantMessage]);
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
      setFreeLoading(false);
    }
  };


  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatMode === "database") {
        handleSubmit(e);
      } else {
        sendFreeTalk(e);
      }
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <button
          className="back-btn"
          onClick={() => navigate("/dashboard")}
          type="button"
        >
          ← Back to Dashboard
        </button>
        <div className="mode-tabs">
          <button
            className={`mode-tab ${chatMode === "database" ? "active" : ""}`}
            onClick={() => setChatMode("database")}
          >
            Database Chat
          </button>
          <button
            className={`mode-tab ${chatMode === "free" ? "active" : ""}`}
            onClick={() => setChatMode("free")}
          >
            Free Chat
          </button>
        </div>
      </div>

      {/* Database Selection (only for database mode) */}
      {chatMode === "database" && (
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
          
          <div className="schema-creation-option">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isCreatingSchema}
                onChange={(e) => {
                  setIsCreatingSchema(e.target.checked);
                  if (e.target.checked) {
                    setSelectedDbId(""); // Clear database selection when creating schema
                  }
                }}
                className="checkbox-input"
              />
              <span className="checkbox-text">Create New Schema</span>
            </label>
            <p className="checkbox-description">
              Check this to create a new database schema instead of querying an existing one
            </p>
          </div>
        </div>
      )}


      {/* Messages Container */}
      <div className="messages-container">
        {history.length === 0 ? (
          <div className="welcome-message">
            <h2>👋 Hi! I'm your 2SQL AI Assistant</h2>
            <p>
              {chatMode === "database" 
                ? "I can help you work with your database! Ask me to:\n• Show data: 'Show me all customers'\n• Add data: 'Add a new customer named John'\n• Update data: 'Change John's city to New York'\n• Delete data: 'Remove customer with email john@test.com'\n• Analyze data: 'Which city has the most customers?'\n• Create schemas: 'Create a school database with teachers and students'"
                : "I'm here to help! I can answer questions, explain concepts, help with coding, or just have a friendly chat. What would you like to talk about?"
              }
            </p>
          </div>
        ) : (
          <div className="messages">
            {history.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div className="message-content">
                  <div className="message-text">{msg.content}</div>
                  
                  {msg.sql && (
                    <div className="sql-block">
                      <div className="sql-header">🔍 SQL Query:</div>
                      <pre className="sql-code">{msg.sql}</pre>
                    </div>
                  )}
                  
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
                  
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {(loading || freeLoading) && (
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
        <form onSubmit={
          chatMode === "database" ? handleSubmit : sendFreeTalk
        } className="input-form">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={chatMode === "database" ? message : freeTalk}
              onChange={(e) => {
                if (chatMode === "database") {
                  setMessage(e.target.value);
                  setShowSuggestions(true);
                } else {
                  setFreeTalk(e.target.value);
                }
              }}
              onKeyPress={handleKeyPress}
              placeholder={
                chatMode === "database" 
                  ? (isCreatingSchema 
                      ? "Describe the schema you want to create..." 
                      : "Ask a question about your database...")
                  : "Message AI..."
              }
              className="message-input"
              rows={1}
              disabled={loading || freeLoading}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            <button
              type="submit"
              disabled={
                loading || 
                freeLoading ||
                (chatMode === "database" ? !message || (!selectedDbId && !isCreatingSchema) : !freeTalk)
              }
              className="send-btn"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </form>
        
        {/* Suggestions */}
        {showSuggestions && chatMode === "database" && message && suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions
              .filter((s) => s.toLowerCase().includes(message.toLowerCase()))
              .slice(0, 5)
              .map((s, i) => (
                <div 
                  key={i} 
                  className="suggestion-item"
                  onClick={() => { 
                    setMessage(s); 
                    setShowSuggestions(false);
                    textareaRef.current?.focus();
                  }}
                >
                  {s}
                </div>
              ))}
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
