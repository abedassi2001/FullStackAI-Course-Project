// src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="homepage">
      <div className="homepage-container">
        {/* Header */}
        <header className="homepage-header">
          <div className="logo">
            <h1>2SQL AI</h1>
            <p>Natural Language to SQL Converter</p>
          </div>
        </header>

        {/* Hero Section */}
        <main className="homepage-main">
          <div className="hero-content">
            <h2>Transform Natural Language into SQL Queries</h2>
            <p className="hero-description">
              Our AI-powered platform converts your natural language questions into precise SQL queries, 
              making database interaction as simple as having a conversation.
            </p>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Natural Language Processing</h3>
                <p>Ask questions in plain English and get accurate SQL queries</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M4 7V4C4 3.44772 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 4V7M4 7H20M4 7V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V7M8 11H16M8 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Database Management</h3>
                <p>Upload and manage your databases with ease</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Smart AI Assistant</h3>
                <p>Powered by advanced AI for intelligent query generation</p>
              </div>
            </div>

            <div className="cta-section">
              <h3>Ready to get started?</h3>
              <div className="cta-buttons">
                <Link to="/login" className="btn btn-primary">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="homepage-footer">
          <p>&copy; 2024 2SQL AI. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}