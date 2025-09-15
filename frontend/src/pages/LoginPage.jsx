// src/pages/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css"; // can reuse RegisterPage.css styles too

// CRA/webpack: use REACT_APP_API_URL (fallback to 5000)
const API_BASE = (
  process.env.REACT_APP_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // If you're not using cookies/sessions, you can remove credentials:
        credentials: "include",
        body: JSON.stringify(form),
      });

      // Parse JSON safely; if it's not JSON, fall back to raw text
      const raw = await res.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch {}

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          (raw && raw.trim()) ||
          `HTTP ${res.status}`;
        alert(`Error: ${msg}`);
        return;
      }

      // Success — store JWT + user info
      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      alert(`Network error: ${err?.message || "Failed to reach server"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hero">
      <div className="noise"></div>

      <header className="hero__nav">
        <Link to="/" className="brand">2SQL</Link>
      </header>

      <main className="hero__content">
        <h1 className="title">Sign in to <span>2SQL</span> 🔑</h1>
        <p className="subtitle">Enter your email and password to access your account.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="actions">
          <span className="muted">Don't have an account? </span>
          <Link to="/register" className="btn btn-ghost">Register</Link>
        </div>
      </main>

      <footer className="hero__footer">
        <span>© {new Date().getFullYear()} 2SQL</span>
      </footer>
    </div>
  );
}
