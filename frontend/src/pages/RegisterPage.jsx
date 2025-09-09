import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RegisterPage.css";

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
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,        // 👈 fixed: send `name`
          email: formData.email,
          password: formData.password,
        }),
      });

      if (res.ok) {
        alert("Registration successful!");
        navigate("/login"); // redirect to login page
      } else {
        const err = await res.json();
        alert("Error: " + err.message);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

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
              name="name"                 // 👈 fixed
              value={formData.name}       // 👈 fixed
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
