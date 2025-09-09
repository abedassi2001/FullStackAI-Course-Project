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
    </div>
  );
}
