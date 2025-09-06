const sqlite3 = require("sqlite3").verbose();

const openDB = (filePath) => new sqlite3.Database(filePath, sqlite3.OPEN_READWRITE);

const runSQL = (dbFilePath, sql) => {
  const db = openDB(dbFilePath);
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      db.close();
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

module.exports = { runSQL };
