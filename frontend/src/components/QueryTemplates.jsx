// frontend/src/components/QueryTemplates.jsx
import React, { useState } from 'react';
import './QueryTemplates.css';

const QueryTemplates = ({ onSelectTemplate, selectedDbId }) => {
  const [activeCategory, setActiveCategory] = useState('all');

  const templates = {
    all: [
      { text: "Show me all customers", category: "select", icon: "👥" },
      { text: "Find products with price over 100", category: "select", icon: "🔍" },
      { text: "Add a new customer named John", category: "insert", icon: "➕" },
      { text: "Create a products table", category: "create", icon: "🏗️" },
      { text: "Build a database from this data", category: "build", icon: "🏗️" },
      { text: "Show me all tables", category: "metadata", icon: "📋" },
      { text: "Update customer city to New York", category: "update", icon: "✏️" },
      { text: "Remove customer with email test@example.com", category: "delete", icon: "🗑️" },
      { text: "Count how many orders each customer made", category: "analysis", icon: "📊" }
    ],
    select: [
      { text: "Show me all customers", category: "select", icon: "👥" },
      { text: "Find customers from New York", category: "select", icon: "🏙️" },
      { text: "Get top 5 customers by total orders", category: "select", icon: "🏆" },
      { text: "Show average salary by department", category: "select", icon: "💰" },
      { text: "Find products with price over 100", category: "select", icon: "🔍" },
      { text: "Get customers created this month", category: "select", icon: "📅" },
      { text: "Show products in Electronics category", category: "select", icon: "📱" },
      { text: "Find orders between January and March", category: "select", icon: "📊" }
    ],
    insert: [
      { text: "Add a new customer named John Smith", category: "insert", icon: "👤" },
      { text: "Insert a new product with name 'Laptop' and price 999", category: "insert", icon: "💻" },
      { text: "Add a new employee with name 'Alice' and department 'IT'", category: "insert", icon: "👩‍💼" },
      { text: "Insert a new order for customer ID 123", category: "insert", icon: "🛒" },
      { text: "Add a new category called 'Electronics'", category: "insert", icon: "📂" },
      { text: "Insert a new user with email 'user@example.com'", category: "insert", icon: "✉️" }
    ],
    update: [
      { text: "Change John's city to Los Angeles", category: "update", icon: "🏙️" },
      { text: "Update product price to 1200 where name is 'Laptop'", category: "update", icon: "💰" },
      { text: "Set all employees in IT department salary to 80000", category: "update", icon: "💼" },
      { text: "Change customer status to 'active' where id = 5", category: "update", icon: "✅" },
      { text: "Update order status to 'shipped' for order 123", category: "update", icon: "🚚" },
      { text: "Set product category to 'Electronics' where price > 500", category: "update", icon: "📱" }
    ],
    delete: [
      { text: "Remove customer with email john@test.com", category: "delete", icon: "👤" },
      { text: "Delete all products with price less than 50", category: "delete", icon: "💸" },
      { text: "Remove employees from the old department", category: "delete", icon: "👥" },
      { text: "Delete orders older than 1 year", category: "delete", icon: "🗓️" },
      { text: "Remove all inactive customers", category: "delete", icon: "❌" },
      { text: "Delete products with no category", category: "delete", icon: "📦" }
    ],
    create: [
      { text: "Create a users table with name, email, and created_at", category: "create", icon: "👥" },
      { text: "Create a products table with name, price, and category", category: "create", icon: "📦" },
      { text: "Create an orders table with customer_id and order_date", category: "create", icon: "🛒" },
      { text: "Create a schema called abedtest", category: "create", icon: "🏗️" },
      { text: "Create random tables", category: "create", icon: "🎲" },
      { text: "Create a schema called test and add an item", category: "create", icon: "🏗️" },
      { text: "Create a school database with teachers and students", category: "create", icon: "🏫" },
      { text: "Create a company database with employees and departments", category: "create", icon: "🏢" },
      { text: "Create a blog database with posts and comments", category: "create", icon: "📝" }
    ],
    metadata: [
      { text: "Show me all tables", category: "metadata", icon: "📋" },
      { text: "Describe the customers table", category: "metadata", icon: "📊" },
      { text: "What columns are in the products table?", category: "metadata", icon: "🔍" },
      { text: "List all databases", category: "metadata", icon: "🗄️" },
      { text: "Show table structure for orders", category: "metadata", icon: "🏗️" },
      { text: "What's the schema of the users table?", category: "metadata", icon: "📐" }
    ],
    analysis: [
      { text: "Which customer has the most orders?", category: "analysis", icon: "🏆" },
      { text: "What's the trend in sales over time?", category: "analysis", icon: "📈" },
      { text: "Compare revenue by department", category: "analysis", icon: "⚖️" },
      { text: "Find the correlation between price and sales", category: "analysis", icon: "🔗" },
      { text: "What are the top 10 products by sales?", category: "analysis", icon: "🥇" },
      { text: "Show me the distribution of customer ages", category: "analysis", icon: "📊" },
      { text: "Find outliers in product prices", category: "analysis", icon: "🎯" },
      { text: "What's the average order value by month?", category: "analysis", icon: "📅" }
    ],
    build: [
      { text: "Build a database from this data", category: "build", icon: "🏗️" },
      { text: "Create a database from this CSV data", category: "build", icon: "📊" },
      { text: "Make a database with this JSON data", category: "build", icon: "📋" },
      { text: "Build a customer database from this data", category: "build", icon: "👥" },
      { text: "Create a product catalog database", category: "build", icon: "📦" },
      { text: "Build an employee management database", category: "build", icon: "👩‍💼" },
      { text: "Create a school database with students and teachers", category: "build", icon: "🏫" },
      { text: "Build a blog database with posts and comments", category: "build", icon: "📝" },
      { text: "Create an e-commerce database from this data", category: "build", icon: "🛒" },
      { text: "Build a library management database", category: "build", icon: "📚" }
    ]
  };

  const categories = [
    { key: 'all', label: 'All Examples', icon: '🌟' },
    { key: 'select', label: 'Show Data', icon: '👁️' },
    { key: 'insert', label: 'Add Data', icon: '➕' },
    { key: 'update', label: 'Change Data', icon: '✏️' },
    { key: 'delete', label: 'Remove Data', icon: '🗑️' },
    { key: 'create', label: 'Create Tables', icon: '🏗️' },
    { key: 'build', label: 'Build Database', icon: '🏗️' },
    { key: 'metadata', label: 'Database Info', icon: '📋' },
    { key: 'analysis', label: 'Analysis', icon: '📊' }
  ];

  const currentTemplates = templates[activeCategory] || templates.all;

  return (
    <div className="query-templates">
      <div className="templates-header">
        <h3>💡 Query Examples</h3>
        <p>Click any example to try it out!</p>
      </div>
      
      <div className="template-categories">
        {categories.map(category => (
          <button
            key={category.key}
            className={`category-btn ${activeCategory === category.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.key)}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-label">{category.label}</span>
          </button>
        ))}
      </div>

      <div className="templates-grid">
        {currentTemplates.map((template, index) => (
          <div
            key={index}
            className={`template-item ${template.category}`}
            onClick={() => onSelectTemplate(template.text)}
          >
            <div className="template-icon">{template.icon}</div>
            <div className="template-text">{template.text}</div>
            <div className="template-category">{template.category}</div>
          </div>
        ))}
      </div>

      {!selectedDbId && (
        <div className="templates-note">
          <p>💡 <strong>Tip:</strong> Select a database above to get personalized suggestions based on your data!</p>
        </div>
      )}
    </div>
  );
};

export default QueryTemplates;
