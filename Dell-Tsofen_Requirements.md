# 🚀 Dell–Tsofen Project Requirements  
*A Unified BRD + PRD + SRS Document*  

This document merges the perspectives of **Business Requirements (BRD)**, **Product Requirements (PRD)**, and **Software Requirements Specification (SRS)** into a single reference for the **Dell–Tsofen project**.  

The system will be built using:  
- **Database**: MongoDB  
- **Backend**: Node.js + Express  
- **Frontend**: React.js  

---

## 📌 1. Business Requirements (BRD)

### 🔹 Problem / Need
- ⏱️ Non-technical users need to explore **data quickly** without writing queries.  
- 💬 Users should interact with data via **natural language prompts**, not Mongo queries.  
- 📊 Easily analyze relationships & trends **without coding dashboards or queries**.  
- 🔄 Provide a **scalable web-based tool** usable across Dell products.  

### 🎯 Business Goals
- 📈 Enable **self-service data analysis** for all employees.  
- 🙅 Reduce dependency on DB admins/analysts.  
- ⚡ Accelerate **business insights** with instant answers.  
- 🌍 Build a **reusable tool** for Dell’s ecosystem.  

---

## 🛠️ 2. Product Requirements (PRD)

### 📝 Overview
The system will:  
1. Store and manage data in **MongoDB**.  
2. Provide a **React frontend** for entering prompts and viewing results.  
3. Use an **Express backend** to process requests.  
4. Convert **natural language → MongoDB queries** (via GPT/OpenAI API).  
5. Return **tabular or chart-based results** in the UI.  

---

### ⭐ Core Features
- 🤖 **Prompt → MongoDB Query translation**.  
- 🛡️ **Safe execution**: validate queries against schema & block dangerous ops.  
- 🧠 **Schema awareness**: collections, documents, fields, relationships, synonyms.  
- 🖥️ **Frontend (React)**:
  - Search/prompt input box + Run button.  
  - Display results in **tables and charts**.  
  - Error messages (invalid prompts, empty results).  

- 📂 **Backend (Express)**:
  - Handles API calls from frontend.  
  - Uses GPT to generate queries.  
  - Validates queries before running them on MongoDB.  

- 📝 **Data Management**:
  - Store history of prompts and results.  
  - Allow exporting results (CSV, JSON).  

- 💡 **Usability**:
  - Tooltips/examples to guide prompt writing.  
  - Allow database updates (CRUD) via natural language with reasoning displayed.  

---

### 💎 Nice-to-Have Features
- ⚡ **Live auto-suggestions** while typing in React UI.  
- 📖 **Explain MongoDB query** feature.  
- 💬 **Chat-style interface** for follow-ups (*“Now group by date”*).  
- 📊 **Visualization support** (charts for aggregated queries).  

---

## 🖥️ 3. Software Requirements Specification (SRS)

### ✅ Functional Requirements
1. **Natural Language Processing**  
   - Convert NL prompts → MongoDB queries.  
   - Handle synonyms (*clients = customers*).  
   - Support conversational chaining (if chat mode enabled).  

2. **Query Safety & Validation**  
   - Backend validates all generated queries.  
   - Prevent unsafe updates/deletes without user confirmation.  
   - Error handling:
     - ❌ Invalid prompt → query.  
     - ❌ Query execution errors.  
     - ❌ Empty results.  

3. **Database Integration (MongoDB)**  
   - Connect to MongoDB cluster.  
   - Manage collections (e.g., Customers, Orders, Products).  
   - Support CRUD operations via natural language.  

4. **Frontend (React)**  
   - Prompt input box + Run button.  
   - Display results in:
     - ✅ Table format for raw data.  
     - ✅ Charts for aggregations (sales trends, top products, etc.).  
   - Allow SQL/Mongo preview & editing.  

5. **Backend (Express + Node.js)**  
   - API endpoints:
     - `POST /query` → convert prompt to Mongo query + execute.  
     - `GET /history` → fetch past prompts/results.  
     - `POST /export` → export results (CSV/JSON).  
   - Integrate with GPT for query generation.  

---

### ⚙️ Non-Functional Requirements
- ⚡ **Performance**: Queries should return results ≤ 2 sec (for up to 100k docs).  
- 🔐 **Security**: Prevent injection, sanitize inputs, enforce role-based access.  
- 🌐 **Scalability**: Handle large Mongo collections + future APIs.  
- 🎨 **Usability**: Responsive UI, intuitive for non-technical users.  

---

### 📊 Examples

**Example 1: Retrieve documents**  
Prompt: *"Show me all customers from New York."*  
Generated Mongo Query:  
```js
db.customers.find({ city: "New York" }, { name: 1, city: 1 })
