// Uses Node's built-in SQLite module (no extra dependency, no native compilation).
// Requires Node.js v22.5+.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// DB_PATH lets a host point the database at a persistent disk (e.g. /var/data/inventory.db).
const dbPath = process.env.DB_PATH || path.join(__dirname, 'inventory.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
-- People who log in: the owner, and employees (shopkeepers) who record sales.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','employee')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- The items the shop stocks, with the current quantity on hand.
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- One row per end-of-day submission by an employee: what was sold, in total, that day.
CREATE TABLE IF NOT EXISTS daily_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  record_date TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT,
  total_expected_revenue REAL NOT NULL,
  actual_cash_received REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES users(id)
);

-- The line items inside a daily record: how many of each product were sold that day.
CREATE TABLE IF NOT EXISTS daily_record_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daily_record_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  quantity_sold INTEGER NOT NULL,
  price_at_time REAL NOT NULL,
  FOREIGN KEY (daily_record_id) REFERENCES daily_records(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- A simple history of every stock change, so you can see why a number changed.
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  done_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (done_by) REFERENCES users(id)
);
`);

module.exports = db;
