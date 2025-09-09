// src/pages/AIChatPage.jsx
//user chat 

import React, { useState } from "react";
import axios from "axios";

export default function AIChatPage() {
  const [message, setMessage] = useState("");
  const [dbFile, setDbFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setDbFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!message || !dbFile) {
      setError("Both message and DB file are required.");
      return;
    }

    const formData = new FormData();
    formData.append("message", message);
    formData.append("dbfile", dbFile);

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/ai/chat", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
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
      <h1>AI Chat with Database</h1>

      <form onSubmit={handleSubmit} className="chat-form">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask your question..."
          rows={4}
          className="message-input"
        />

        <input
          type="file"
          accept=".db,.sqlite"
          onChange={handleFileChange}
          className="file-input"
        />

        <button type="submit" disabled={loading} className="submit-btn">
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
