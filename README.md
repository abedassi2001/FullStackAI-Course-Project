# 2SQL AI

**Natural Language → SQL** platform for querying databases without writing SQL.

Built as a **Dell–Tsofen** Full-Stack AI course project. Non-technical users ask questions in plain English; the system generates SQL, runs it safely, and returns results.

> Example: *“Show me the top 5 customers by total purchase.”* → SQL is generated, validated, executed, and shown in a table.

---

## Features

- **Prompt-to-SQL** — Convert natural language into SQL using OpenAI
- **Safe execution** — Validate queries against the schema before running them
- **Database upload** — Upload and manage SQLite (`.db`) files
- **AI Database Builder** — Create databases from JSON, CSV, or text descriptions
- **Chat interface** — ChatGPT-style UI for asking questions and reviewing history
- **Export** — Download results as CSV or JSON
- **Auth** — Register / login with JWT-protected routes
- **Optional MySQL** — Sync / query MySQL when enabled
- **Email** — Optionally send database files via SMTP

---

## Tech Stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | React 19, React Router, Axios, Create React App |
| **Backend** | Node.js, Express 5 |
| **AI** | OpenAI API |
| **Databases** | MongoDB (users, chats, metadata), SQLite (uploaded DBs), MySQL (optional) |
| **Auth** | JWT, bcrypt |
| **Other** | Multer (uploads), Nodemailer (email), Sequelize / mysql2 |

---

## Project Structure

```
FullStack-Ai-project/
├── frontend/          # React client (port 3000)
├── backend/           # Express API (port 5000)
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── repositories/
│   ├── routers/
│   ├── services/
│   └── utils/
├── docs/              # Requirements, API notes, user stories
└── package.json       # Root scripts (run client + server together)
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** (local or Atlas)
- **OpenAI API key**
- *(Optional)* MySQL, if you set `USE_MYSQL=true`
- *(Optional)* SMTP credentials for email

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/abedassi2001/FullStackAI-Course-Project.git
cd FullStackAI-Course-Project
```

### 2. Install dependencies

```bash
# Root (concurrently)
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 3. Configure environment variables

Create a `backend/.env` file:

```env
# Server
PORT=5000

# MongoDB (required)
MONGO_URI=mongodb://localhost:27017/2sql
# or: mongodb+srv://<user>:<password>@<cluster>.mongodb.net/2sql

# Auth
JWT_SECRET=your-strong-secret-key

# OpenAI (required for AI features)
OPENAI_API_KEY=sk-...

# MySQL (optional)
USE_MYSQL=false
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASS=
MYSQL_DB=query

# Email (optional — see backend/EMAIL_SETUP.md)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### 4. Run the app

**Both frontend and backend together** (from the project root):

```bash
npm run dev
```

**Or separately:**

```bash
# Terminal 1 — API
cd backend
npm start
# or: npm run dev  (with nodemon)

# Terminal 2 — UI
cd frontend
npm start
```

| Service   | URL |
|-----------|-----|
| Frontend  | http://localhost:3000 |
| Backend   | http://localhost:5000 |

---

## How to Use

1. Open http://localhost:3000 and **register** / **sign in**
2. Go to **Databases** and upload a SQLite `.db` file (or build one with AI)
3. Open the **chat** and ask questions in plain English
4. Review generated SQL, results, and export if needed

**AI Database Builder examples:**

```
Build a database from this data:
[{"name": "John", "email": "john@example.com", "department": "IT"}]
```

```
Create a database from this CSV data:
name,age,email
John,30,john@example.com
```

---

## Main API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users/register` | Create account |
| `POST` | `/users/login` | Login (JWT) |
| `POST` | `/uploads/...` | Upload / manage databases |
| `POST` | `/queries/...` | Natural language → SQL + results |
| `POST` | `/ai/...` | AI chat / builder endpoints |
| `GET/POST` | `/chats/...` | Chat history |

More detail: [`docs/restAPI.md`](docs/restAPI.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/Dell-Tsofen_Requirements.md`](docs/Dell-Tsofen_Requirements.md) | Project requirements |
| [`docs/UserStories--UseCases.md`](docs/UserStories--UseCases.md) | Use cases & user stories |
| [`docs/restAPI.md`](docs/restAPI.md) | API documentation |
| [`DATABASE_BUILDER_FEATURE.md`](DATABASE_BUILDER_FEATURE.md) | AI Database Builder |
| [`backend/EMAIL_SETUP.md`](backend/EMAIL_SETUP.md) | SMTP / email setup |

---

## Scripts

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | Root | Start backend + frontend |
| `npm start` | `backend/` | Start API server |
| `npm run dev` | `backend/` | API with nodemon |
| `npm start` | `frontend/` | Start React app |
| `npm run build` | `frontend/` | Production build |

---

## License

ISC

---

## Acknowledgments

Developed as part of the **Dell–Tsofen Full-Stack AI** course collaboration, aimed at making data access easier for non-technical users through natural language.
