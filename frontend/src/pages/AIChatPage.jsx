// src/pages/AIChatPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AIChatPage.css";

export default function AIChatPage() {
  const [message, setMessage] = useState("");
  const [selectedDbId, setSelectedDbId] = useState("");
  const [databases, setDatabases] = useState([]);
  const [response, setResponse] = useState(null);
  const [history, setHistory] = useState([]); // {role: 'user'|'assistant', content: string}
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [freeTalk, setFreeTalk] = useState("");
  const [freeLoading, setFreeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
      setResponse(res.data);
      setHistory((h) => [
        ...h,
        { role: "user", content: message },
        { role: "assistant", content: res.data?.explanation || JSON.stringify(res.data?.rows) },
      ]);
      setMessage("");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const sendFreeTalk = async (e) => {
    e.preventDefault();
    if (!freeTalk || freeLoading) return;
    try {
      setFreeLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/ai/talk",
        { message: freeTalk, history },
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );
      const reply = res.data?.reply || "";
      setHistory((h) => [...h, { role: "user", content: freeTalk }, { role: "assistant", content: reply }]);
      setFreeTalk("");
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setFreeLoading(false);
    }
  };

  return (
    <div className="chat-wrapper">
      <main className="chat-card">
        <div className="chat-header">
          <button
            className="btn ghost"
            onClick={() => navigate("/dashboard")}
            type="button"
          >
            ← Back to Dashboard
          </button>
          <h1>AI Chat with Database</h1>
        </div>

        <form onSubmit={handleSubmit} className="chat-form">
        <div className="form-group">
          <label htmlFor="database-select">Select Database:</label>
          <select
            id="database-select"
            value={selectedDbId}
            onChange={(e) => setSelectedDbId(e.target.value)}
            className="database-select"
            required
          >
            <option value="">Choose a database...</option>
            {databases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.filename} ({Math.round(db.bytes / 1024)}KB)
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ position: "relative" }}>
          <label htmlFor="message-input">Your Question:</label>
          <textarea
            id="message-input"
            value={message}
            onChange={(e) => { setMessage(e.target.value); setShowSuggestions(true); }}
            placeholder="Ask your question about the database..."
            rows={4}
            className="message-input"
            required
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && message && suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions
                .filter((s) => s.toLowerCase().includes(message.toLowerCase()))
                .slice(0, 5)
                .map((s, i) => (
                  <li key={i} onClick={() => { setMessage(s); setShowSuggestions(false); }}>{s}</li>
                ))}
            </ul>
          )}
        </div>

        <div className="actions">
          <button type="submit" disabled={loading || !selectedDbId} className="btn primary" onClick={() => setShowSuggestions(false)}>
            {loading ? "Processing..." : "Send to AI"}
          </button>
        </div>
        </form>

      <form onSubmit={sendFreeTalk} className="chat-form" style={{ marginTop: 20 }}>
        <div className="form-group">
          <label htmlFor="free-input">Chat with AI:</label>
          <input
            id="free-input"
            type="text"
            className="database-select"
            placeholder="Say anything..."
            value={freeTalk}
            onChange={(e) => setFreeTalk(e.target.value)}
            disabled={freeLoading}
          />
        </div>
        <div className="actions">
          <button type="submit" className="btn ghost" disabled={freeLoading} aria-busy={freeLoading}>
            {freeLoading ? "Thinking..." : "Send"}
          </button>
        </div>
      </form>

      {error && <p className="error-message">{error}</p>}

      {response && (
        <div className="response-container">
          <h2>Generated SQL:</h2>
          <pre>{response.sql}</pre>

          <h2>Query Results:</h2>
          <pre>{JSON.stringify(response.rows, null, 2)}</pre>

          <h2>AI Explanation:</h2>
          <p>{response.explanation}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="response-container">
          <h2>Conversation</h2>
          <ul className="chat-history">
            {history.map((m, idx) => (
              <li key={idx} className={m.role}>{m.role === "user" ? "You" : "AI"}: {m.content}</li>
            ))}
          </ul>
        </div>
      )}
      </main>
    </div>
  );
}
