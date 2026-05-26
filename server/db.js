const fs = require("fs");
const path = require("path");
const { createSeedDatabase } = require("./seed");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORAGE_DIR = path.join(__dirname, "..", "storage");
const UPLOAD_DIR = path.join(STORAGE_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureDirectories() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function initDb() {
  ensureDirectories();

  if (!fs.existsSync(DB_FILE) || fs.readFileSync(DB_FILE, "utf8").trim() === "") {
    const seedDb = await createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seedDb, null, 2), "utf8");
  }
}

function readDb() {
  ensureDirectories();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  return db;
}

module.exports = {
  DB_FILE,
  STORAGE_DIR,
  UPLOAD_DIR,
  initDb,
  readDb,
  writeDb
};
