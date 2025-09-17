import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './ChatGPTLayout.css';

const ChatGPTLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [titleLoading, setTitleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch chat history
  const fetchChats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/chats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(res.data.chats || []);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    }
  };

  // Create new chat
  const createNewChat = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:5000/chats", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newChat = res.data.chat;
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      navigate(`/chat/${newChat.id}`);
    } catch (err) {
      console.error("Failed to create chat:", err);
      // If creating chat fails, just navigate to home
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  // Select chat
  const selectChat = (chatId) => {
    setCurrentChatId(chatId);
    navigate(`/chat/${chatId}`);
  };

  // Delete chat
  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        navigate('/');
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  // Update chat title
  const updateChatTitle = (chatId, newTitle) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, title: newTitle } : chat
    ));
  };

  // Set title loading state
  const setTitleLoadingState = (loading) => {
    setTitleLoading(loading);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate('/login');
  };

  useEffect(() => {
    fetchChats();
  }, []);

  // Update currentChatId when URL changes
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/chat/')) {
      const chatId = path.split('/chat/')[1];
      setCurrentChatId(chatId);
    } else if (path === '/app' || path === '/home') {
      setCurrentChatId(null);
    }
  }, [location.pathname]);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // Check if we're on the home page (no chatId)
  const isHomePage = location.pathname === '/app' || location.pathname === '/home';

  return (
    <div className="chatgpt-layout">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button 
            className="new-chat-btn"
            onClick={createNewChat}
            disabled={isLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New chat
          </button>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          <div className="chat-history">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                onClick={() => selectChat(chat.id)}
              >
                <div className="chat-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>
                    {titleLoading && currentChatId === chat.id ? (
                      <span className="title-loading">
                        <span className="loading-dots">
                          <span>.</span><span>.</span><span>.</span>
                        </span>
                      </span>
                    ) : (
                      chat.title || 'New Chat'
                    )}
                  </span>
                </div>
                <button
                  className="delete-chat-btn"
                  onClick={(e) => deleteChat(chat.id, e)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="nav-items">
              <button
                className={`nav-item ${isActive('/databases') ? 'active' : ''}`}
                onClick={() => navigate('/databases')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7V4C4 3.44772 4.44772 3 5 3H19C19.5523 3 20 3.44772 20 4V7M4 7H20M4 7V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V7M8 11H16M8 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Databases
              </button>
            </div>
            
            <div className="user-section">
              <button className="user-btn" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {React.cloneElement(children, { 
          createNewChat, 
          updateChatTitle, 
          setTitleLoadingState,
          currentChatId 
        })}
      </div>
    </div>
  );
};

export default ChatGPTLayout;
