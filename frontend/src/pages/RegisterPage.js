import { Link } from "react-router-dom";
import "./RegisterPage.css"; // we can reuse HomePage.css for base styles

export default function RegisterPage() {
  return (
    <div className="hero">
      <div className="noise"></div>

      <header className="hero__nav">
        <Link to="/" className="brand">FullStackAI</Link>
      </header>

      <main className="hero__content">
        <h1 className="title">Create your <span>FullStackAI</span> account ✨</h1>
        <p className="subtitle">Fill in the details below to start building and testing your projects.</p>

        <form className="register-form">
          <label>
            Full Name
            <input type="text" name="fullname" placeholder="John Doe" required />
          </label>

          <label>
            Email
            <input type="email" name="email" placeholder="you@example.com" required />
          </label>

          <label>
            Password
            <input type="password" name="password" placeholder="Enter your password" required />
          </label>

          <label>
            Confirm Password
            <input type="password" name="confirmPassword" placeholder="Confirm your password" required />
          </label>

          <label className="checkbox-label">
            <input type="checkbox" name="terms" required />
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
