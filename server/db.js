// db.js - SQLite database connection, schema creation, and seed data
require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/alzayn.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- SCHEMA ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password TEXT,
  avatar TEXT DEFAULT NULL,
  is_verified INTEGER DEFAULT 0,
  is_banned INTEGER DEFAULT 0,
  auth_provider TEXT DEFAULT 'local',
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  reset_token TEXT,
  reset_token_expires INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT DEFAULT 'signup',
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  balance REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- fund | data | airtime | cable | electricity | vpn | shop | referral | admin_credit
  amount REAL NOT NULL,
  reference TEXT UNIQUE,
  status TEXT DEFAULT 'pending', -- pending | success | failed
  channel TEXT DEFAULT 'wallet', -- wallet | monnify
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  image TEXT,
  category TEXT,
  stock INTEGER DEFAULT 100,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  items TEXT NOT NULL, -- JSON string [{product_id, name, qty, price}]
  total REAL NOT NULL,
  status TEXT DEFAULT 'Pending', -- Pending | Processing | Delivered | Cancelled
  payment_channel TEXT DEFAULT 'wallet',
  reference TEXT UNIQUE,
  address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vtu_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  network TEXT NOT NULL, -- MTN | GLO | AIRTEL | 9MOBILE
  plan_type TEXT NOT NULL, -- SME | GIFTING | CORPORATE
  size TEXT NOT NULL, -- e.g 1GB
  validity TEXT NOT NULL, -- e.g 30 Days
  price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS vtu_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL, -- data | airtime | cable | electricity
  network TEXT,
  phone TEXT,
  plan TEXT,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'success', -- success | failed | pending
  reference TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vpn_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price REAL NOT NULL,
  devices INTEGER DEFAULT 1,
  features TEXT -- JSON array string
);

CREATE TABLE IF NOT EXISTS vpn_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  plan_name TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active | expired
  config_key TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(plan_id) REFERENCES vpn_plans(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);
`);

// ---------- MIGRATIONS (safe to run on an existing database - only adds columns) ----------
function addColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}
// VTpass linkage for data plans
addColumn('vtu_prices', 'vtpass_code', 'TEXT');
addColumn('vtu_prices', 'service_id', 'TEXT');
addColumn('vtu_prices', 'cost_price', 'REAL DEFAULT 0');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_vtu_prices_code ON vtu_prices(service_id, vtpass_code)');
// Delivery details for VTU transactions
addColumn('vtu_transactions', 'token', 'TEXT');
addColumn('vtu_transactions', 'provider_ref', 'TEXT');
addColumn('vtu_transactions', 'provider_message', 'TEXT');
addColumn('vtu_transactions', 'cost', 'REAL');
addColumn('vtu_transactions', 'updated_at', 'TEXT');
// Online payment (Monnify) details on every transaction
addColumn('transactions', 'provider_ref', 'TEXT');
addColumn('transactions', 'meta', 'TEXT');

// ---------- SEED DATA (idempotent) ----------
function seed() {
  // Admin account
  const adminExists = db.prepare('SELECT * FROM admins WHERE username = ?').get(process.env.ADMIN_USERNAME || 'admin');
  if (!adminExists) {
    const hashed = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(process.env.ADMIN_USERNAME || 'admin', hashed);
    console.log('✔ Admin account seeded (admin / admin123)');
  }

  // Site settings
  const defaultSettings = {
    site_name: 'Al-Zayn Hub',
    whatsapp_number: process.env.WHATSAPP_NUMBER || '2348012345678',
    paystack_public_key: process.env.PAYSTACK_PUBLIC_KEY || '',
    paystack_secret_key: process.env.PAYSTACK_SECRET_KEY || '',
    referral_bonus: process.env.REFERRAL_BONUS || '500',
  };
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  Object.entries(defaultSettings).forEach(([k, v]) => insertSetting.run(k, String(v)));

  // Products (8 dummy products)
  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (productCount === 0) {
    const products = [
      ['Anker 20W USB-C Charger', 'Fast charging power adapter, compact and durable.', 8500, '/images/products/charger.jpg', 'Accessories', 50],
      ['Wireless Earbuds Pro', 'Noise-cancelling wireless earbuds with 30hr battery life.', 15000, '/images/products/earbuds.jpg', 'Audio', 40],
      ['128GB Flash Drive', 'High-speed USB 3.0 flash drive for fast transfers.', 6500, '/images/products/flashdrive.jpg', 'Storage', 100],
      ['Power Bank 20000mAh', 'Dual USB output power bank, fast charge supported.', 12000, '/images/products/powerbank.jpg', 'Accessories', 60],
      ['HDMI Cable 2m', 'High-speed HDMI cable supporting 4K resolution.', 3500, '/images/products/hdmi.jpg', 'Cables', 80],
      ['Bluetooth Speaker Mini', 'Portable Bluetooth speaker with deep bass.', 9800, '/images/products/speaker.jpg', 'Audio', 45],
      ['Laptop Cooling Pad', 'Dual fan cooling pad for laptops up to 17 inches.', 11500, '/images/products/coolingpad.jpg', 'Accessories', 30],
      ['Type-C to Type-C Cable', 'Durable braided fast-charge data cable.', 2500, '/images/products/typec.jpg', 'Cables', 120],
    ];
    const insertProduct = db.prepare('INSERT INTO products (name, description, price, image, category, stock) VALUES (?,?,?,?,?,?)');
    products.forEach(p => insertProduct.run(...p));
    console.log('✔ 8 products seeded');
  }

  // VTU Data Prices
  const vtuCount = db.prepare('SELECT COUNT(*) as c FROM vtu_prices').get().c;
  if (vtuCount === 0) {
    const prices = [
      ['MTN', 'SME', '500MB', '30 Days', 150],
      ['MTN', 'SME', '1GB', '30 Days', 280],
      ['MTN', 'SME', '2GB', '30 Days', 550],
      ['MTN', 'SME', '5GB', '30 Days', 1350],
      ['GLO', 'GIFTING', '1GB', '30 Days', 250],
      ['GLO', 'GIFTING', '2GB', '30 Days', 480],
      ['GLO', 'GIFTING', '5GB', '30 Days', 1200],
      ['AIRTEL', 'CORPORATE', '1GB', '30 Days', 270],
      ['AIRTEL', 'CORPORATE', '2GB', '30 Days', 520],
      ['AIRTEL', 'CORPORATE', '5GB', '30 Days', 1300],
      ['9MOBILE', 'GIFTING', '1GB', '30 Days', 260],
      ['9MOBILE', 'GIFTING', '2GB', '30 Days', 500],
    ];
    const insertVtu = db.prepare('INSERT INTO vtu_prices (network, plan_type, size, validity, price) VALUES (?,?,?,?,?)');
    prices.forEach(p => insertVtu.run(...p));
    console.log('✔ VTU data prices seeded');
  }

  // VPN Plans (3 plans)
  const vpnCount = db.prepare('SELECT COUNT(*) as c FROM vpn_plans').get().c;
  if (vpnCount === 0) {
    const plans = [
      ['Basic', 30, 2000, 1, JSON.stringify(['1 Device', '10 Server Locations', 'Standard Speed', 'Email Support'])],
      ['Pro', 30, 4500, 3, JSON.stringify(['3 Devices', '30+ Server Locations', 'High Speed', 'Priority Support', 'No Logs Policy'])],
      ['Premium', 90, 11000, 5, JSON.stringify(['5 Devices', 'All Server Locations', 'Ultra-Fast Speed', '24/7 Priority Support', 'No Logs Policy', 'Ad Blocker'])],
    ];
    const insertVpn = db.prepare('INSERT INTO vpn_plans (name, duration_days, price, devices, features) VALUES (?,?,?,?,?)');
    plans.forEach(p => insertVpn.run(...p));
    console.log('✔ VPN plans seeded');
  }
}

seed();

module.exports = db;
