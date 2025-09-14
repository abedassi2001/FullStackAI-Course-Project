// src/pages/HomePage.jsx
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import "./HomePage.css";

export default function HomePage() {
  const [currentFeature, setCurrentFeature] = useState(0);
  
  const features = [
    "Upload SQLite databases",
    "Convert to MySQL schemas", 
    "Ask questions with AI",
    "Generate SQL queries",
    "Visualize your data"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="hero">
      <div className="noise"></div>
      <div className="floating-elements">
        <div className="floating-card card-1">📊</div>
        <div className="floating-card card-2">🤖</div>
        <div className="floating-card card-3">⚡</div>
        <div className="floating-card card-4">🔍</div>
        <div className="floating-card card-5">💾</div>
      </div>

      <header className="hero__nav">
        <Link to="/" className="brand">
          <span className="brand-icon">2</span>
          <span className="brand-text">SQL</span>
        </Link>
        <div className="nav-links">
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/register" className="nav-link nav-link-primary">Get Started</Link>
        </div>
      </header>

      <main className="hero__content">
        <div className="hero-badge">
          <span className="badge-icon">🚀</span>
          <span>AI-Powered Database Assistant</span>
        </div>
        
        <h1 className="title">
          Transform Your Data with 
          <span className="gradient-text"> 2SQL</span>
        </h1>
        
        <p className="subtitle">
          Upload SQLite databases, convert them to MySQL schemas, and chat with AI to query your data naturally.
        </p>

        <div className="feature-showcase">
          <div className="feature-text">
            <span className="feature-label">Now featuring:</span>
            <span className="feature-highlight">{features[currentFeature]}</span>
          </div>
        </div>

        <div className="actions">
          <Link to="/register" className="btn btn-primary">
            <span className="btn-icon">✨</span>
            Start Free Trial
          </Link>
          <Link to="/login" className="btn btn-ghost">
            <span className="btn-icon">👤</span>
            Sign In
          </Link>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-number">100%</div>
            <div className="stat-label">AI Powered</div>
          </div>
          <div className="stat">
            <div className="stat-number">∞</div>
            <div className="stat-label">Queries</div>
          </div>
          <div className="stat">
            <div className="stat-number">⚡</div>
            <div className="stat-label">Real-time</div>
          </div>
        </div>
      </main>

      <footer className="hero__footer">
        <div className="footer-content">
          <span>© {new Date().getFullYear()} 2SQL - AI Database Assistant</span>
          <div className="footer-links">
            <button className="footer-link">Privacy</button>
            <button className="footer-link">Terms</button>
            <button className="footer-link">Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
