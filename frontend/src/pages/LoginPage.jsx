import { Link } from "react-router-dom";
import "./LoginPage.css"; // we can reuse HomePage.css or create small overrides

export default function LoginPage() {
  return (
    <div className="hero">
      <div className="noise"></div>

      <header className="hero__nav">
        <Link to="/" className="brand">FullStackAI</Link>
      </header>

      <main className="hero__content">
        <h1 className="title">Sign in to <span>FullStackAI</span> 🔑</h1>
        <p className="subtitle">Enter your email and password to access your account.</p>

        <form className="login-form">
          <label>
            Email
            <input type="email" name="email" placeholder="you@example.com" required />
          </label>

          <label>
            Password
            <input type="password" name="password" placeholder="Enter your password" required />
          </label>

          <button type="submit" className="btn btn-primary">Log In</button>
        </form>

        <div className="actions">
          <span className="muted">Don't have an account? </span>
          <Link to="/register" className="btn btn-ghost">Register</Link>
        </div>
      </main>

      <footer className="hero__footer">
        <span>© {new Date().getFullYear()} FullStackAI</span>
      </footer>
    </div>
  );
}
