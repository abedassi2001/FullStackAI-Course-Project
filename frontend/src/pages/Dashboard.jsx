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
