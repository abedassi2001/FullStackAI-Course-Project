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

      navigate("/app");
    } catch (err) {
      alert(`Network error: ${err?.message || "Failed to reach server"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Sign in to 2SQL</h1>
        <p>Enter your email and password to access your account.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="login-footer">
          <span>Don't have an account? </span>
          <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
