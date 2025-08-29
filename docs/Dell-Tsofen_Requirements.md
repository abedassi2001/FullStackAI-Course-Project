# 🌟 Dell – Tsofen Project Requirements Document
## 1. Introduction & Problem/Need 
In modern organizations, access to data is critical for decision-making. However, many employees who need information do not have the technical skills required to write SQL queries. They must rely on database administrators or technical staff to retrieve information, which creates bottlenecks, wastes time, and reduces productivity.
Currently, several challenges exist:
Users waste time waiting for DB admins to write queries.
Business users often need answers quickly but must submit requests to IT teams, leading to delays.


SQL syntax is hard for non-technical staff,writing queries requires knowledge of database structures and SQL language, which most employees lack.


Manual dashboards are slow and rigid.
Traditional BI dashboards are pre-defined and cannot answer ad-hoc questions easily, forcing users to adapt their questions instead of exploring freely.
**This project aims to**
 address these issues by developing a Prompt-to-SQL system where users can type questions in plain English, and the system automatically converts them into SQL queries. This reduces dependency on technical staff and empowers users to interact with databases directly in a safe and user-friendly way.
**Real-life example**
If John, a sales manager, wants to know the top 5 customers by total purchase, today he must either write a complex SQL query or ask a database administrator to do it for him. With our system, John can simply type:
“Show me the top 5 customers by total purchase.”
The system will generate the correct SQL, run it, and show the results immediately.


By bridging the gap between natural language and structured queries, this project will make data exploration faster, smarter, and easier for Dell’s employees.


2. **Project Scope**
The scope of this project defines what features will be delivered in the prototype and what will not be included.


**In Scope (included)**
 -Natural language prompt-to-SQL conversion.
 -Safe SQL execution with validation.
 -Results displayed in a table format.
 -Exporting results to CSV and JSON.
 -Query history with ability to reuse past prompts.


**Out of Scope (not included)**
 -Advanced visualization dashboards (graphs, charts, BI tools).
 -Support for unstructured databases (e.g., NoSQL).
 -Scaling to very large enterprise databases (initial   release supports SQLite only).
 -Real-time streaming data analytics.
This scope ensures the project remains focused on delivering a working prototype of the core functionality within the set timeframe.


3. **Project Objectives**
The primary objective of this project is to empower Dell employees to interact with databases using natural language prompts, reducing technical barriers and improving efficiency. The following SMART objectives guide the development:


Specific: Implement a system that converts natural language prompts into valid SQL queries.
Measurable: Achieve at least 95% accuracy in generating valid queries on test cases.
Achievable: Start with SQLite support only, with a plan to extend later to MySQL/PostgreSQL.
Relevant: Increase productivity by reducing reliance on DB admins and enabling self-service analytics for Dell users.
Time-bound: Deliver a working prototype within 5 weeks, including core features (prompt-to-SQL, execution, results table, export, history).


By following these objectives, the project ensures a realistic, valuable, and timely delivery aligned with the goals of the Dell–Tsofen collaboration.
—


## 2. Functional Requirements


This section defines the functional requirements of the Dell–Tsofen Prompt-to-SQL system. These requirements describe what the system must do to meet the project objectives.


### 2.1 Core Functional Requirements


1. **Database Upload and Validation**


   * The system shall allow users to upload a valid `.db` file.
   * The system shall validate the file type and database schema before accepting it.
   * The system shall reject invalid or corrupted files with a clear error message.


2. **Natural Language Prompt Processing**


   * The system shall accept user prompts in natural language.
   * The system shall convert the prompt into a valid SQL query using GPT API.
   * The system shall validate the generated SQL against the database schema before execution.


3. **SQL Execution**


   * The system shall execute validated SQL queries safely against the uploaded database.
   * The system shall prevent unsafe operations (e.g., DROP TABLE, DELETE ALL) unless explicitly authorized.
   * The system shall handle errors during execution and provide user-friendly messages.


4. **Results Display and Export**


   * The system shall display query results in a tabular format.
   * The system shall show execution time and row count.
   * The system shall allow exporting results in CSV and JSON formats.


5. **History and Tracking**


   * The system shall maintain a history of past prompts and executed queries.
   * Users shall be able to browse and reuse previous prompts and queries.


6. **Optional Features (Nice-to-Have)**


   * Live auto-suggestions while typing prompts.
   * SQL explanation or preview before execution.
   * Chat-style interface supporting follow-up queries.


### 2.2 System Interfaces


* **User Interface (UI)**: Command-line interface on Linux with prompt textbox, SQL preview, results table, export buttons, and history panel.
* **Database Interface**: SQLite database (initial release) with possible future support for MySQL/PostgreSQL.
* **API Interface**: OpenAI GPT API for natural language to SQL conversion.


### 2.3 System Behavior and Workflow


1. User uploads a valid database file.
2. User enters a natural language prompt.
3. System processes the prompt using GPT API to generate SQL.
4. System validates SQL against the database schema.
5. System executes validated SQL and displays results.
6. User can view history and export results.
7. System handles errors with clear messages and guidance.


### 2.4 Functional Requirements Table


| Requirement ID | Description                            | Priority | Notes                                             |
| -------------- | -------------------------------------- | -------- | ------------------------------------------------- |
| FR-01          | Upload and validate `.db` files        | High     | Must prevent corrupted files                      |
| FR-02          | Convert natural language prompt to SQL | High     | GPT API integration required                      |
| FR-03          | Validate SQL queries                   | High     | Ensure safe operations                            |
| FR-04          | Execute SQL and display results        | High     | Results in tabular format                         |
| FR-05          | Export results                         | Medium   | CSV and JSON formats                              |
| FR-06          | Maintain history                       | Medium   | At least last 20 queries                          |
| FR-07          | Optional features                      | Low      | Auto-suggestions, SQL explanation, chat interface |


---


## 3. Quality & Design (Claude)


### 3.1 Non-Functional Requirements (NFRs)


**Usability:**


* Simple and intuitive for non-technical users.
* Example prompts on startup.
* Tooltips and inline hints.
* SQL preview and edit before execution.


**Performance:**


* Respond within 3–5 seconds for typical queries.
* SQL preview appears immediately.


**Reliability:**


* At least 95% success rate in converting valid prompts.
* Maintain history of last 20 queries.
* Auto-retry for transient API errors.


**Security:**


* Validate SQL queries before execution.
* Prevent unsafe operations without confirmation.
* API keys stored securely.
* Uploaded DB remains local; only prompts/schema summaries sent to API.
* Sanitize and validate queries to prevent SQL injection.


**Error Handling:**


* Clear user-friendly messages.
* Avoid technical stack traces.
* Provide error codes with optional details.


### 3.2 User Interface Requirements


* Textbox for prompts.
* Run button.
* SQL preview (editable, syntax highlighting).
* Results table with pagination and execution time.
* Export CSV/JSON buttons.
* File upload field (.db validation).
* History panel.
* Tooltips and example prompts.
* Optional: chat-style interface.


### 3.3 UI Flow Description


1. User uploads a valid `.db` file.
2. Prompt textbox enabled with example prompts.
3. User types question.
4. User clicks Run; SQL generated and shown in preview.
5. SQL validated; editable.
6. Valid SQL executed.
7. Results displayed in table; execution time and row count shown.
8. User may export results.
9. Query and results saved in history panel.
10. Errors handled with clear messages.


### 3.4 Wireframe (Conceptual)


```
--------------------------------------------------------
[ 📂 Upload DB file ]   [ Current DB: example.db ]
--------------------------------------------------------
[ 💬 Prompt textbox: 'Enter your question...' ]
[ ▶️ Run Button ]
--------------------------------------------------------
[ SQL Preview (editable) ]
--------------------------------------------------------
[ 📊 Results Table ]
[ 📥 Export CSV ] [ 📤 Export JSON ]
--------------------------------------------------------
[ 🕒 History panel: Previous queries ]
--------------------------------------------------------
```


### 3.5 Constraints & Assumptions


**Technology Constraints:**


* Dependent on OpenAI GPT API.
* Query size limited; large prompts may be simplified.
* Supports relational databases (SQLite initially).


**Platform Constraints:**


* Interface runs via Linux terminal.
* Requires valid `.db` before queries.
* Export compatible across OS.


**Security Constraints:**


* Validate SQL before execution.
* Maintain data privacy; API receives only prompts/schema summaries.
* API keys stored securely.


**Operational Constraints:**


* Limited by GPT API rate limits.
* Handles only structured relational databases initially.


**User Assumptions:**


* Basic database literacy.
* Clear prompts in English.
* Tool is productivity aid, not replacement for SQL expertise.


**System Assumptions:**


* OpenAI API operational and accessible.
* Database schema is correct.
* System parses tables/relationships automatically.


**Organizational Assumptions:**


* Dell maintains GPT API subscription.
* Ethical/compliance clearance obtained.
* Timeline allows iterative development and refinement.
