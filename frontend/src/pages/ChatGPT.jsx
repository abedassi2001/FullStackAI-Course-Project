import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ChatGPT.css';

const ChatGPT = ({ createNewChat }) => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDbId, setSelectedDbId] = useState('');
  const [databases, setDatabases] = useState([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [editingSql, setEditingSql] = useState(null);
  const [editedSql, setEditedSql] = useState('');
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch chat messages
  const fetchMessages = useCallback(async () => {
    if (!chatId || chatId === 'undefined' || chatId === 'null') {
      setMessages([]);
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`http://localhost:5000/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const dbMessages = res.data.messages || [];
      const formattedMessages = dbMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        sql: msg.sql,
        rows: msg.queryResults?.rows || null,
        columns: msg.queryResults?.columns || null,
        isDualResponse: msg.queryResults?.isDualResponse || false,
        chatExplanation: msg.queryResults?.chatExplanation || null,
        tableDropped: msg.metadata?.tableDropped || false,
        droppedTableName: msg.metadata?.droppedTableName || null
      }));
      
      setMessages(formattedMessages);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      // Don't show error to user, just set empty messages
      setMessages([]);
    }
  }, [chatId]);

  // Fetch databases
  const fetchDatabases = useCallback(async () => {
    try {
      setIsLoadingDatabases(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/uploads", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDatabases(res.data.databases || []);
    } catch (err) {
      console.error("Failed to fetch databases:", err);
    } finally {
      setIsLoadingDatabases(false);
    }
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (query = '') => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsLoadingSuggestions(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ q: query });
      if (selectedDbId) params.append('dbId', selectedDbId);
      
      const res = await axios.get(`http://localhost:5000/ai/suggestions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setSuggestions(res.data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [selectedDbId]);

  useEffect(() => {
    if (chatId) {
      fetchMessages();
    } else {
      // Clear messages when no chatId (home page)
      setMessages([]);
    }
    fetchDatabases();
  }, [chatId, fetchMessages, fetchDatabases]);

  // Debounced suggestions fetching
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (input.trim().length > 0) {
        fetchSuggestions(input);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [input, selectedDbId, fetchSuggestions]);

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // If no chatId, create a new chat first
    let currentChatId = chatId;
    if (!currentChatId) {
      if (createNewChat) {
        // Use the createNewChat function from parent
        createNewChat();
        return;
      } else {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.post("http://localhost:5000/chats", {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          currentChatId = res.data.chat.id;
          navigate(`/chat/${currentChatId}`);
        } catch (err) {
          console.error("Failed to create chat:", err);
          return;
        }
      }
    }

    const messageContent = input.trim();
    
    const userMessage = {
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`http://localhost:5000/chats/${currentChatId}/messages`, {
        message: messageContent,
        dbId: selectedDbId || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const assistantMessage = {
        role: 'assistant',
        content: res.data.explanation || 'Query executed successfully',
        timestamp: new Date(),
        sql: res.data.sql,
        rows: res.data.rows,
        columns: res.data.columns,
        isDualResponse: res.data.isDualResponse || false,
        chatExplanation: res.data.chatExplanation,
        tableDropped: res.data.tableDropped || false,
        droppedTableName: res.data.droppedTableName
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Refresh databases if needed
      if (res.data.schemaCreated || res.data.tableDropped) {
        fetchDatabases();
      }
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${err.response?.data?.message || err.message}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Start editing SQL
  const startEditingSql = (messageIndex, sql) => {
    setEditingSql(messageIndex);
    setEditedSql(sql);
  };

  // Cancel editing SQL
  const cancelEditingSql = () => {
    setEditingSql(null);
    setEditedSql('');
  };

  // Execute edited SQL
  const executeEditedSql = async (messageIndex) => {
    if (!editedSql.trim()) return;

    setIsExecutingSql(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`http://localhost:5000/chats/${chatId}/messages`, {
        message: `Execute this SQL: ${editedSql}`,
        dbId: selectedDbId || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update the message with new results
      setMessages(prev => prev.map((msg, idx) => {
        if (idx === messageIndex) {
          return {
            ...msg,
            sql: editedSql,
            rows: res.data.rows,
            columns: res.data.columns,
            content: res.data.explanation || 'Query executed successfully'
          };
        }
        return msg;
      }));

      setEditingSql(null);
      setEditedSql('');
    } catch (err) {
      alert(`Error executing SQL: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsExecutingSql(false);
    }
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion) => {
    setInput(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
    textareaRef.current?.focus();
  };

  // Handle clicking outside suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Export database to CSV
  const exportDatabase = async (format = 'csv') => {
    if (!selectedDbId) {
      alert('Please select a database first');
      return;
    }

    setIsExporting(true);
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
      const contentDisposition = response.headers['content-disposition'];
      let filename = `database_export_${new Date().toISOString().split('T')[0]}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // If no chatId, show welcome screen
  if (!chatId) {
    return (
      <div className="chatgpt-page">
        <div className="welcome-screen">
          <div className="welcome-content">
            <h1>2SQL AI Assistant</h1>
            <p>Start a new conversation to interact with your databases using natural language.</p>
            <div className="features">
              <div className="feature">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Natural Language Queries</span>
              </div>
              <div className="feature">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7V4C4 3.44772 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 4V7M4 7H20M4 7V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V7M8 11H16M8 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Database Management</span>
              </div>
              <div className="feature">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Smart SQL Generation</span>
              </div>
            </div>
            <div className="welcome-actions">
              <button 
                className="start-chat-btn"
                onClick={createNewChat}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chatgpt-page">
      {/* Database Selector */}
      <div className="database-selector">
        <select
          value={selectedDbId}
          onChange={(e) => setSelectedDbId(e.target.value)}
          className="db-select"
          disabled={isLoadingDatabases}
        >
          <option value="">
            {isLoadingDatabases ? 'Loading databases...' : 
             databases.length === 0 ? 'No databases available - Upload one first' : 'Choose a database...'}
          </option>
          {databases.map((db) => (
            <option key={db.id} value={db.id}>
              {db.filename} ({db.tableCount} tables, {db.totalRows} rows)
            </option>
          ))}
        </select>
        {selectedDbId && (
          <button
            className="export-btn"
            onClick={() => exportDatabase('csv')}
            disabled={isExporting}
            title="Export current database to CSV"
          >
            {isExporting ? (
              <div className="loading-spinner">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        )}
        {databases.length === 0 && (
          <div className="no-databases-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Go to Databases page to upload your first database</span>
          </div>
        )}
      </div>

      {/* Explanation Toggle and Export Buttons */}
      <div className="explanation-toggle-container">
        <button
          className={`explanation-toggle ${showExplanations ? 'active' : ''}`}
          onClick={() => setShowExplanations(!showExplanations)}
          title={showExplanations ? 'Hide explanations' : 'Show explanations'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{showExplanations ? 'Hide Explanations' : 'Show Explanations'}</span>
        </button>
        
        {selectedDbId && (
          <div className="export-buttons-group">
            <button
              className="export-btn-small csv"
              onClick={() => exportDatabase('csv')}
              disabled={isExporting}
              title="Export current database to CSV"
            >
              {isExporting ? (
                <div className="loading-spinner-small">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              CSV
            </button>
            <button
              className="export-btn-small json"
              onClick={() => exportDatabase('json')}
              disabled={isExporting}
              title="Export current database to JSON"
            >
              {isExporting ? (
                <div className="loading-spinner-small">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              JSON
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <h2>How can I help you today?</h2>
            <p>Ask me anything about your database or start a conversation!</p>
          </div>
        ) : (
          <div className="messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-avatar">
                  {/* Emoji added via CSS */}
                </div>
                <div className="message-content">
                  {/* Message Content - Always show */}
                  {message.content && (
                    <div className="message-text">{message.content}</div>
                  )}
                  
                  
                  {/* SQL Query Block */}
                  {message.sql && (
                    <div className="sql-block">
                      <div className="sql-header">
                        SQL Query:
                        <div className="sql-actions">
                          <button 
                            className="sql-edit-btn"
                            onClick={() => startEditingSql(index, message.sql)}
                            title="Edit SQL"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                      {editingSql === index ? (
                        <div className="sql-edit-container">
                          <textarea
                            className="sql-edit-textarea"
                            value={editedSql}
                            onChange={(e) => setEditedSql(e.target.value)}
                            rows={Math.max(3, editedSql.split('\n').length)}
                            placeholder="Enter your SQL query..."
                          />
                          <div className="sql-edit-actions">
                            <button 
                              className="sql-execute-btn"
                              onClick={() => executeEditedSql(index)}
                              disabled={isExecutingSql || !editedSql.trim()}
                            >
                              {isExecutingSql ? 'Executing...' : 'Execute'}
                            </button>
                            <button 
                              className="sql-cancel-btn"
                              onClick={cancelEditingSql}
                              disabled={isExecutingSql}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <pre className="sql-code">{message.sql}</pre>
                      )}
                    </div>
                  )}
                  
                  {/* Data Results Block */}
                  {message.rows && message.rows.length > 0 && (
                    <div className="results-block">
                      <div className="results-header">Data ({message.rows.length} rows):</div>
                      <div className="results-table">
                        <table>
                          <thead>
                            <tr>
                              {message.columns?.map((col, i) => (
                                <th key={i}>{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {message.rows.slice(0, 10).map((row, i) => (
                              <tr key={i}>
                                {message.columns?.map((col, j) => (
                                  <td key={j}>{JSON.stringify(row[col])}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {message.rows.length > 10 && (
                          <div className="results-footer">
                            Showing first 10 of {message.rows.length} rows
                          </div>
                        )}
                      </div>
                      {/* Export Buttons */}
                      <div className="export-buttons-group">
                        <button
                          className="export-btn-small csv"
                          onClick={() => exportDatabase('csv')}
                          disabled={isExporting}
                          title="Export current database to CSV"
                        >
                          {isExporting ? (
                            <div className="loading-spinner-small">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          CSV
                        </button>
                        <button
                          className="export-btn-small json"
                          onClick={() => exportDatabase('json')}
                          disabled={isExporting}
                          title="Export current database to JSON"
                        >
                          {isExporting ? (
                            <div className="loading-spinner-small">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          JSON
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* ChatGPT Explanation Block */}
                  {message.isDualResponse && message.chatExplanation && showExplanations && (
                    <div className="chat-explanation-block">
                      <div className="chat-explanation-header">AI Explanation:</div>
                      <div className="chat-explanation-text">{message.chatExplanation}</div>
                    </div>
                  )}
                  
                  {/* Hidden Explanation Indicator */}
                  {message.isDualResponse && message.chatExplanation && !showExplanations && (
                    <div className="explanation-hidden">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>AI Explanation hidden - click toggle to show</span>
                    </div>
                  )}
                  
                  {/* Table Dropped Block */}
                  {message.tableDropped && (
                    <div className="table-dropped-block">
                      <div className="table-dropped-header">Table Dropped:</div>
                      <div className="table-dropped-info">
                        <p><strong>Table:</strong> {message.droppedTableName}</p>
                        <p><strong>Status:</strong> Successfully removed from database</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar"></div>
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
        <form onSubmit={sendMessage} className="input-form">
          <div className="input-wrapper" ref={suggestionsRef}>
            <div className="input-suggestions-container">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Message 2SQL AI..."
                className="message-input"
                rows={1}
                disabled={isLoading}
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  <div className="suggestions-header">
                    <span>Suggestions</span>
                    {isLoadingSuggestions && (
                      <div className="suggestions-loading">
                        <div className="loading-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="suggestions-list">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="suggestion-item"
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        <span className="suggestion-text">{suggestion}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="send-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatGPT;
