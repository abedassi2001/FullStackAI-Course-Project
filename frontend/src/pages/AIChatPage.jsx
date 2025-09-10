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
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button 
          className="back-btn" 
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

        <div className="form-group">
          <label htmlFor="message-input">Your Question:</label>
          <textarea
            id="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask your question about the database..."
            rows={4}
            className="message-input"
            required
          />
        </div>

        <button type="submit" disabled={loading || !selectedDbId} className="submit-btn">
          {loading ? "Processing..." : "Send to AI"}
        </button>
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
    </div>
  );
}
