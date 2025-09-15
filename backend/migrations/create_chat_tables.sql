-- Create chat tables for persistent storage
-- Run this script to set up chat storage

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (user_id),
    INDEX (created_at)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY,
    chat_id VARCHAR(36) NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    sql_query TEXT NULL,
    query_results JSON NULL,
    metadata JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    INDEX (chat_id),
    INDEX (created_at)
);

-- Create database_selections table to track which database was used in each chat
CREATE TABLE IF NOT EXISTS database_selections (
    id VARCHAR(36) PRIMARY KEY,
    chat_id VARCHAR(36) NOT NULL,
    database_id INT NOT NULL,
    selected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (database_id) REFERENCES user_databases(id) ON DELETE CASCADE,
    INDEX (chat_id),
    INDEX (database_id)
);
