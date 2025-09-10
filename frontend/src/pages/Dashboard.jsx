// src/pages/Dashboard.jsx  (path as you use)
import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { uploadDatabase, activateDemoDatabase } from "../services/dbService";

export default function Dashboard() {
  const navigate = useNavigate();

  // Status & uploading (from claude)
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Chat states (from main)
  const [message, setMessage] = useState("");
  const [dbFile, setDbFile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatFileRef = useRef(null);

  // Require auth (from main)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  // ---------- DB Picker / Uploader (claude) ----------
  const onPickFile = () => fileInputRef.current?.click();

  const allowed = [".sql", ".sqlite", ".db", ".csv", ".json"];
  const isAllowed = (file) =>
    allowed.some((ext) => file.name.toLowerCase().endsWith(ext));

  const onFilesSelected = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!isAllowed(file)) {
      setStatus({ type: "error", msg: "Unsupported file type." });
      return;
    }

    setIsUploading(true);
    setStatus({ type: "info", msg: "Uploading…" });

    try {
      await uploadDatabase(file);
      // Keep a copy for chat if the API expects an attached DB per message
      setDbFile(file);
      setStatus({ type: "success", msg: "Database uploaded successfully." });
    } catch (e) {
      setStatus({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "Upload failed.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      // If backend switches to demo DB server-side, file is optional
      setDbFile(null);
      setStatus({ type: "success", msg: "Demo database is ready!" });
    } catch (e) {
      setStatus({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "Could not load demo DB.",
      });
    }
  };

  // ---------- Chat (main) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!message && !dbFile) {
      alert("Please enter a message or attach a DB file.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("message", message);
    if (dbFile) formData.append("dbfile", dbFile);

    try {
      const res = await fetch("http://localhost:5000/ai/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ type: "error", msg: data?.message || "Something went wrong" });
      } else {
        setChatHistory((prev) => [
          ...prev,
          { type: "user", text: message },
          { type: "ai", text: data.explanation },
        ]);
        setMessage("");
        if (chatFileRef.current) chatFileRef.current.value = "";
        setStatus({ type: "success", msg: "Message sent." });
      }
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", msg: "Server error" });
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

      {/* Card 1: Choose / Upload DB */}
      <main className="db-card">
        <h1>Choose your database</h1>
        <p className="subtitle">
          You can add your own database now or use our demo database.
        </p>

        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          aria-busy={isUploading}
        >
          <p className="drop-title">Drag & drop your file here</p>
          <p className="drop-sub">Supported: .sql, .sqlite, .db, .csv, .json</p>
          <button
            className="btn primary"
            onClick={onPickFile}
            disabled={isUploading}
            type="button"
          >
            Add Your Database <span className="muted">(2–5 min)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => onFilesSelected(e.target.files)}
            accept=".sql,.sqlite,.db,.csv,.json"
          />
        </div>

        <div className="or">or</div>

        <button
          className="btn ghost"
          onClick={onUseDemo}
          disabled={isUploading}
          type="button"
        >
          Use Demo Database <span className="muted">(Instant)</span>
        </button>

        {status.msg && <div className={`alert ${status.type}`}>{status.msg}</div>}
      </main>

      {/* Card 2: Chat */}
      <main className="db-card" style={{ marginTop: 16 }}>
        <h2>Start your first chat</h2>
        <form className="form" onSubmit={handleSubmit}>
          <textarea
            className="textarea"
            placeholder="Ask something about your data…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <input
            ref={chatFileRef}
            type="file"
            accept=".sql,.sqlite,.db,.csv,.json"
            onChange={(e) => setDbFile(e.target.files?.[0] || null)}
          />
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send"}
          </button>
        </form>

        {chatHistory.length > 0 && (
          <div className="chat">
            {chatHistory.map((m, i) => (
              <div key={i} className={`bubble ${m.type}`}>
                {m.text}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
