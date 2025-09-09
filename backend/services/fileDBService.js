// backend/services/fileDBService.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mysql = require("mysql2/promise");
const sqlite3 = require("sqlite3").verbose();

// ---- Env mapping: supports MYSQL_PASS + MYSQL_DB (your names) and the standard ones
const MYSQL_HOST = process.env.MYSQL_HOST || "localhost";
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || "root";
const MYSQL_PASSWORD =
  process.env.MYSQL_PASSWORD ?? process.env.MYSQL_PASS ?? "";
const MYSQL_DATABASE =
  process.env.MYSQL_DATABASE ?? process.env.MYSQL_DB ?? "query";

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
  throw new Error(
    "MySQL env missing. Set MYSQL_HOST, MYSQL_USER and either MYSQL_DATABASE or MYSQL_DB (and MYSQL_PASSWORD or MYSQL_PASS)."
  );
}

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

// --- ensure schema (called lazily before first use) ---
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  const ddl = `
    CREATE TABLE IF NOT EXISTS user_databases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      file LONGBLOB NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX (user_id)
    )
  `;
  await pool.execute(ddl);
  schemaReady = true;
}

// Optional health check
async function pingMySQL() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}

// ---------- MySQL (blob storage) ----------
async function saveDbBufferToMySQL(userId, filename, buffer) {
  await ensureSchema();
  const sql = `
    INSERT INTO user_databases (user_id, filename, file, created_at)
    VALUES (?, ?, ?, NOW())
  `;
  const [rs] = await pool.execute(sql, [String(userId), filename, buffer]);
  return rs.insertId;
}

async function fetchDbBufferFromMySQL(dbId, userId) {
  await ensureSchema();
  const [rows] = await pool.execute(
    "SELECT id, user_id, filename, file FROM user_databases WHERE id = ? AND user_id = ?",
    [dbId, String(userId)]
  );
  if (!rows.length) return null;
  return rows[0]; // { id, user_id, filename, file: Buffer }
}

// ---------- Temp file helpers ----------
function ensureTmpDir() {
  const dir = path.join(__dirname, "..", "uploads", "tmp");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function bufferToTempSqlite(buffer, origName = "database.db") {
  const dir = ensureTmpDir();
  const base =
    path.basename(origName, path.extname(origName)).replace(/[^\w.-]/g, "_") ||
    "database";
  const key = crypto.randomBytes(6).toString("hex");
  const p = path.join(dir, `${base}-${key}.db`);
  fs.writeFileSync(p, buffer);
  return p;
}

// ---------- SQLite helpers ----------
function openSqlite(dbFilePath) {
  return new sqlite3.Database(dbFilePath, sqlite3.OPEN_READWRITE);
}

function runSQL(dbFilePath, sql) {
  const db = openSqlite(dbFilePath);
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      db.close();
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function getSchema(dbFilePath) {
  const db = openSqlite(dbFilePath);
  const all = (q) =>
    new Promise((res, rej) => db.all(q, (e, r) => (e ? rej(e) : res(r))));
  try {
    const tables = await all(`
      SELECT name, sql
      FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `);

    let out = "";
    for (const t of tables) {
      out += `TABLE ${t.name}:\n`;
      const cols = await all(`PRAGMA table_info(${JSON.stringify(t.name).slice(1,-1)});`);
      for (const c of cols) {
        out += `  - ${c.name} ${c.type || ""}${c.pk ? " PRIMARY KEY" : ""}\n`;
      }
      out += "\n";
    }
    return out.trim();
  } finally {
    db.close();
  }
}

module.exports = {
  // MySQL/BLOB
  saveDbBufferToMySQL,
  fetchDbBufferFromMySQL,
  bufferToTempSqlite,
  pingMySQL,

  // SQLite
  runSQL,
  getSchema,
};
