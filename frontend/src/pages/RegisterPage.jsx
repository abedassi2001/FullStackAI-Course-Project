// frontend/src/pages/RegisterPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RegisterPage.css";

// CRA/webpack: use REACT_APP_API_URL (fallback to 5000)
const API_BASE = (
  process.env.REACT_APP_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

export default function RegisterPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.terms) {
      alert("Please accept the Terms and Conditions");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      // Try to parse JSON; fall back to text so errors aren’t “undefined”
      const raw = await res.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        /* not JSON */
      }

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          (raw && raw.trim()) ||
          `HTTP ${res.status}`;
        alert(`Error: ${msg}`);
        return;
      }

      alert("Registration successful!");
      navigate("/login");
    } catch (err) {
      alert(`Network error: ${err?.message || "Failed to reach server"}`);
    }
  }

  return (
    <div className="hero">
      <div className="noise"></div>

      <header className="hero__nav">
        <Link to="/" className="brand">FullStackAI</Link>
      </header>

      <main className="hero__content">
        <h1 className="title">
          Create your <span>FullStackAI</span> account ✨
        </h1>
        <p className="subtitle">
          Fill in the details below to start building and testing your projects.
        </p>

        <form className="register-form" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              minLength={3}
            />
          </label>

          <label>
            Confirm Password
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
              required
            />
            I agree to the Terms and Conditions
          </label>

          <button type="submit" className="btn btn-primary">Register</button>
        </form>

        <div className="actions">
          <span className="muted">Already have an account? </span>
          <Link to="/login" className="btn btn-ghost">Log In</Link>
        </div>
      </main>

      <footer className="hero__footer">
        <span>© {new Date().getFullYear()} FullStackAI</span>
      </footer>
    </div>
  );
}
