import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './DatabaseManager.css';

const DatabaseManager = () => {
  const [databases, setDatabases] = useState([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [exportingDb, setExportingDb] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recipient, setRecipient] = useState("");       // ⬅️ NEW: optional override recipient
  const [sendingId, setSendingId] = useState(null);     // ⬅️ NEW: per-db email loading state
  const fileInputRef = useRef(null);

  const API_BASE = "http://localhost:5000";

  // Fetch databases
  const fetchDatabases = async () => {
    try {
      setIsLoadingDatabases(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/uploads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDatabases(res.data.databases || []);
    } catch (err) {
      console.error("Failed to fetch databases:", err);
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  // Fetch profile (to default recipient to user's email)
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const me = res?.data || null;
      setProfile(me);
      if (me?.email) setRecipient(me.email);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    }
  };

  useEffect(() => {
    fetchDatabases();
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;

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
      await axios.post(`${API_BASE}/uploads`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        }
      });

      setStatus({ type: "success", msg: "Database uploaded successfully." });
      fetchDatabases(); // Refresh the database list
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

  // Handle drag and drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Delete database
  const deleteDatabase = async (dbId) => {
    if (!window.confirm('Are you sure you want to delete this database?')) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_BASE}/uploads/${dbId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus({ type: "success", msg: "Database deleted successfully!" });
      await fetchDatabases();
    } catch (err) {
      console.error("Delete failed:", err);
      setStatus({
        type: "error",
        msg: `Delete failed: ${err.response?.data?.error || err.message}`
      });
    }
  };

  // Create random database
  const createRandomDatabase = async () => {
    setStatus({ type: "info", msg: "Loading demo database…" });
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/uploads/demo`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus({ type: "success", msg: `Demo DB ready: ${res.data.filename}` });
      fetchDatabases(); // Refresh the database list
    } catch (e) {
      setStatus({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "Could not load demo DB.",
      });
    }
  };

  // Export database (CSV/JSON)
  const exportDatabase = async (dbId, format) => {
    setExportingDb(dbId);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_BASE}/uploads/export/${dbId}/${format}`, {
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

      setStatus({ type: "success", msg: `Database exported as ${format.toUpperCase()}` });
    } catch (err) {
      console.error('Export failed:', err);
      setStatus({
        type: "error",
        msg: `Export failed: ${err.response?.data?.message || err.message}`
      });
    } finally {
      setExportingDb(null);
    }
  };

  // ⬇️ NEW: Email raw .db (to recipient or fallback to user's email)
  const emailDatabase = async (dbId) => {
    try {
      setSendingId(dbId);
      const token = localStorage.getItem("token");
      const body = {};
      if (recipient && recipient.trim()) body.to = recipient.trim();

      const res = await axios.post(`${API_BASE}/uploads/email/${dbId}`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        setStatus({ type: "success", msg: res.data.message || "Database emailed successfully" });
      } else {
        throw new Error(res.data?.error || "Failed to email database");
      }
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err.message;
      let userFriendlyMsg = "Email failed: " + errorMsg;
      
      // Provide more helpful error messages
      if (errorMsg.includes("Database file not found")) {
        userFriendlyMsg = "Email failed: Database file not found. Please try uploading the database again.";
      } else if (errorMsg.includes("No recipient email")) {
        userFriendlyMsg = "Email failed: No recipient email specified. Please enter an email address.";
      } else if (errorMsg.includes("SMTP") || errorMsg.includes("smtp")) {
        userFriendlyMsg = "Email failed: Email service not configured. Please check server configuration.";
      }
      
      setStatus({
        type: "error",
        msg: userFriendlyMsg
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="database-manager">
      <div className="database-content">
        <div className="database-header">
          <h1>Database Manager</h1>
          <p>Upload and manage your SQLite database files</p>
        </div>

        {/* Upload Area */}
        <div className="upload-section">
          <div className="upload-actions">
            <div
              className={`upload-area ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".db,.sqlite,.sqlite3"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />

              {isUploading ? (
                <div className="upload-progress">
                  <div className="progress-circle">
                    <svg width="48" height="48" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#2d2d2d"
                        strokeWidth="4"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="#7c5cff"
                        strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20 * 0.3}`}
                        strokeLinecap="round"
                        transform="rotate(-90 24 24)"
                      />
                    </svg>
                    <span className="progress-text">Uploading...</span>
                  </div>
                  <p>Uploading database...</p>
                </div>
              ) : (
                <div className="upload-content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <h3>Upload Database File</h3>
                  <p>Drag and drop your .db file here, or click to browse</p>
                  <div className="file-types">
                    <span>.db</span>
                    <span>.sqlite</span>
                    <span>.sqlite3</span>
                  </div>
                </div>
              )}
            </div>

            <button
              className="create-random-btn"
              onClick={createRandomDatabase}
              disabled={isUploading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Create Random Database
            </button>
          </div>
        </div>

        {/* Database List */}
        <div className="databases-section">
          <div className="databases-header">
            <div className="header-left">
              <h2>Your Databases</h2>
              {/* ⬇️ Email recipient chooser (optional) */}
              {databases.length > 0 && (
                <div className="email-recipient-picker">
                  <label>Send DB to:</label>
                  <input
                    type="email"
                    value={recipient}
                    placeholder={profile?.email || "recipient@example.com"}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="email-input"
                  />
                </div>
              )}
            </div>
          </div>

          {isLoadingDatabases ? (
            <div className="loading-state">
              <div className="loading-spinner">
                <span></span><span></span><span></span>
              </div>
              <h3>Loading databases...</h3>
            </div>
          ) : databases.length === 0 ? (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M4 7V4C4 3.44772 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 4V7M4 7H20M4 7V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V7M8 11H16M8 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3>No databases yet</h3>
              <p>Upload your first database file to get started</p>
            </div>
          ) : (
            <div className="database-grid">
              {databases.map((db) => (
                <div key={db.id} className="database-card">
                  <div className="database-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M4 7V4C4 3.44772 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 4V7M4 7H20M4 7V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V7M8 11H16M8 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="database-info">
                    <h3>{db.filename}</h3>
                    <div className="database-stats">
                      <span className="stat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M4 7V4C4 3.44772 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 4V7M4 7H20M4 7V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V7M8 11H16M8 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {db.tableCount} tables
                      </span>
                      <span className="stat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {db.totalRows} rows
                      </span>
                    </div>
                    <p className="database-date">
                      Uploaded {new Date(db.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="database-actions">
                    <div className="export-buttons">
                      <button
                        className="action-btn export csv"
                        onClick={() => exportDatabase(db.id, 'csv')}
                        disabled={exportingDb === db.id}
                        title="Export as CSV"
                      >
                        {exportingDb === db.id ? (
                          <div className="loading-spinner">
                            <span></span><span></span><span></span>
                          </div>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        CSV
                      </button>
                      <button
                        className="action-btn export json"
                        onClick={() => exportDatabase(db.id, 'json')}
                        disabled={exportingDb === db.id}
                        title="Export as JSON"
                      >
                        {exportingDb === db.id ? (
                          <div className="loading-spinner">
                            <span></span><span></span><span></span>
                          </div>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        JSON
                      </button>

                      {/* ⬇️ NEW: Email .db button per card */}
                      <button
                        className="action-btn export email"
                        onClick={() => emailDatabase(db.id)}
                        disabled={sendingId === db.id}
                        title="Email the raw .db file"
                      >
                        {sendingId === db.id ? "Emailing…" : "Email .db"}
                      </button>
                    </div>

                    <button
                      className="action-btn delete"
                      onClick={() => deleteDatabase(db.id)}
                      title="Delete database"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Status Message */}
          {status.msg && (
            <div className={`status-message ${status.type}`}>
              {status.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
