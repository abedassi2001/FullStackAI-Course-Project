import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import axios from "axios";

export default function Dashboard() {
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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
      const formData = new FormData();
      formData.append("dbfile", file);
      
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5000/uploads", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        }
      });
      
      setStatus({ type: "success", msg: "Database uploaded successfully." });
    } catch (e) {
      setStatus({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "Upload failed.",
      });
    } finally {
      setIsUploading(false);
      // allow re-selecting the same file name again
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
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/uploads/demo",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: "success", msg: `Demo DB ready: ${res.data.filename}` });
    } catch (e) {
      setStatus({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "Could not load demo DB.",
      });
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

        <div className="navigation-section">
          <button
            className="btn primary"
            onClick={() => navigate("/ai-chat")}
            type="button"
          >
            Go to AI Chat <span className="muted">(Start Querying)</span>
          </button>
        </div>
      </main>
    </div>
  );
}