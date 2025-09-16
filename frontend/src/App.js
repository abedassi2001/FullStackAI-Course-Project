// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import AIChatPage from "./pages/AIChatPage";
import ChatGPT from "./pages/ChatGPT";
import DatabaseManager from "./pages/DatabaseManager";
import ChatGPTLayout from "./components/ChatGPTLayout";

function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return <div className="loading">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function PublicRoute({ children, allowAuthenticated = false }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return <div className="loading">Loading...</div>;
  }

  // If allowAuthenticated is true, always show the children (for login/register pages)
  if (allowAuthenticated) {
    return children;
  }

  return isAuthenticated ? <Navigate to="/app" /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/login" element={
          <PublicRoute allowAuthenticated={true}>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute allowAuthenticated={true}>
            <RegisterPage />
          </PublicRoute>
        } />
        
        {/* Protected Routes with ChatGPT Layout */}
        <Route path="/app" element={
          <ProtectedRoute>
            <ChatGPTLayout>
              <ChatGPT />
            </ChatGPTLayout>
          </ProtectedRoute>
        } />
        <Route path="/home" element={
          <ProtectedRoute>
            <ChatGPTLayout>
              <ChatGPT />
            </ChatGPTLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <ChatGPTLayout>
              <ChatGPT />
            </ChatGPTLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat/:chatId" element={
          <ProtectedRoute>
            <ChatGPTLayout>
              <ChatGPT />
            </ChatGPTLayout>
          </ProtectedRoute>
        } />
        <Route path="/databases" element={
          <ProtectedRoute>
            <ChatGPTLayout>
              <DatabaseManager />
            </ChatGPTLayout>
          </ProtectedRoute>
        } />
        
        {/* Legacy Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <ChatGPTLayout>
              <Dashboard />
            </ChatGPTLayout>
          </ProtectedRoute>
        } />
        <Route path="/ai-chat" element={
          <ProtectedRoute>
            <ChatGPTLayout>
              <AIChatPage />
            </ChatGPTLayout>
          </ProtectedRoute>
        } />
        
        {/* Default route - redirect to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}