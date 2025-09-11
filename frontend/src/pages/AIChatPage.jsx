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
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Fetch user's saved databases on component mount
  useEffect(() => {
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
    if (!message || !selectedDbId) {
      setError("Both message and database selection are required.");
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
        </div>
      )}

      {/* Messages Container */}
      <div className="messages-container">
        {history.length === 0 ? (
          <div className="welcome-message">
            <h2>👋 Hi! I'm your 2SQL AI Assistant</h2>
            <p>
              {chatMode === "database" 
                ? "I can help you work with your database! Ask me to:\n• Show data: 'Show me all customers'\n• Add data: 'Add a new customer named John'\n• Update data: 'Change John's city to New York'\n• Delete data: 'Remove customer with email john@test.com'\n• Analyze data: 'Which city has the most customers?'"
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
        <form onSubmit={chatMode === "database" ? handleSubmit : sendFreeTalk} className="input-form">
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
                  ? "Ask a question about your database..." 
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
                (chatMode === "database" ? !message || !selectedDbId : !freeTalk)
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
