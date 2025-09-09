
import React, { useRef, useState } from "react";
import "./Dashboard.css";
import { uploadDatabase, activateDemoDatabase } from "../services/dbService";

export default function Dashboard() {
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const onPickFile = () => fileInputRef.current?.click();

  const onFilesSelected = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // optional validation
    const allowed = [".sql", ".sqlite", ".db", ".csv", ".json"];
    const ok = allowed.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!ok) {
      setStatus({ type: "error", msg: "Unsupported file type." });
      return;
    }

    setIsUploading(true);
    setStatus({ type: "info", msg: "Uploading…" });
    try {
      await uploadDatabase(file);
      setStatus({ type: "success", msg: "Database uploaded successfully." });
    } catch (e) {
      setStatus({
        type: "error",
        msg: e?.response?.data?.message || "Upload failed.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    onFilesSelected(e.dataTransfer.files);
  };

  const onUseDemo = async () => {
    setStatus({ type: "info", msg: "Loading demo database…" });
    try {
      await activateDemoDatabase();
      setStatus({ type: "success", msg: "Demo database is ready!" });
    } catch (e) {
      setStatus({
        type: "error",
        msg: e?.response?.data?.message || "Could not load demo DB.",
      });
=======
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [dbFile, setDbFile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!message || !dbFile) {
      alert("Please enter a message and upload a DB file.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("message", message);
    formData.append("dbfile", dbFile);

    try {
      const res = await fetch("http://localhost:5000/ai/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Something went wrong");
      } else {
        setChatHistory((prev) => [
          ...prev,
          { type: "user", text: message },
          { type: "ai", text: data.explanation },
        ]);
        setMessage("");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="db-wrapper">
      <aside className="db-steps">
        <div className="step active">
          <span className="badge">1</span> Welcome
        </div>
        <div className="step active">
          <span className="badge">2</span> Choose database
        </div>
        <div className="step">
          <span className="badge">3</span> Start your first chat
        </div>
      </aside>

      <main className="db-card">
        <h1>Choose your database</h1>
        <p className="subtitle">
          You can add your own database now or use our demo database.
        </p>

        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <p className="drop-title">Drag & drop your file here</p>
          <p className="drop-sub">Supported: .sql, .sqlite, .db, .csv, .json</p>
          <button
            className="btn primary"
            onClick={onPickFile}
            disabled={isUploading}
          >
            Add Your Database <span className="muted">(2–5 min)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => onFilesSelected(e.target.files)}
          />
        </div>

        <div className="or">or</div>

        <button className="btn ghost" onClick={onUseDemo} disabled={isUploading}>
          Use Demo Database <span className="muted">(Instant)</span>
        </button>

        {status.msg && (
          <div className={`alert ${status.type}`}>
            {status.msg}
          </div>
        )}
      </main>
=======
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>FullStackAI Chat</h1>
        <button
          onClick={() => {
            localStorage.clear();
            navigate("/login");
          }}
        >
          Logout
        </button>
      </header>

      <div className="chat-window">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".db,.sqlite"
          onChange={(e) => setDbFile(e.target.files[0])}
          required
        />
        <textarea
          placeholder="Ask something about your database..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking..." : "Send"}
        </button>
      </form>
    </div>
  );
}
