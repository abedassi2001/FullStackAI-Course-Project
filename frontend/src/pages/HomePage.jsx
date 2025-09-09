// src/pages/HomePage.jsx
import { Link } from "react-router-dom";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="hero">
      <div className="noise"></div>

      <header className="hero__nav">
        <Link to="/" className="brand">FullStackAI</Link>
        {/* removed the right-side nav links */}
      </header>

      <main className="hero__content">
        <h1 className="title">Welcome to <span>FullStackAI</span> ✨</h1>
        <p className="subtitle">Build and test your project end-to-end. Start a new account or sign in.</p>

        <div className="actions">
          <Link to="/register" className="btn btn-primary">Get Started</Link>
          <Link to="/login" className="btn btn-ghost">I already have an account</Link>
        </div>
      </main>

      <footer className="hero__footer">
        <span>© {new Date().getFullYear()} FullStackAI</span>
      </footer>
    </div>
  );
}
