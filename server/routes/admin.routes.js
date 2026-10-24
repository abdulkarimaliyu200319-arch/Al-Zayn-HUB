const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ---------------- ADMIN LOGIN ----------------
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) return res.status(401).json({ success: false, message: 'Invalid admin credentials' });

  const match = bcrypt.compareSync(password, admin.password);
  if (!match) return res.status(401).json({ success: false, message: 'Invalid admin credentials' });

  const token = jwt.sign({ id: admin.id, username: admin.username, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
  res.json({ success: true, token, admin: { id: admin.id, username: admin.username } });
});

// All routes below require admin auth
router.use(requireAdmin);

// ---------------- DASHBOARD STATS ----------------
router.get('/stats', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const totalOrders = db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM transactions WHERE status='success'").get().s;
  const totalWalletBalance = db.prepare('SELECT COALESCE(SUM(balance),0) s FROM wallets').get().s;
  const pendingOrders = db.prepare("SELECT COUNT(*) c FROM orders WHERE status='Pending'").get().c;
  res.json({ success: true, stats: { totalUsers, totalOrders, totalRevenue, totalWalletBalance, pendingOrders } });
});

// ---------------- MANAGE USERS ----------------
router.get('/users', (req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.is_verified, u.is_banned, u.created_at, w.balance
       FROM users u LEFT JOIN wallets w ON w.user_id = u.id ORDER BY u.id DESC`
    )
    .all();
  res.json({ success: true, users });
});

router.patch('/users/:id/ban', (req, res) => {
  const { banned } = req.body; // true/false
  db.prepare('UPDATE users SET is_banned = ? WHERE id = ?').run(banned ? 1 : 0, req.params.id);
  res.json({ success: true, message: banned ? 'User banned' : 'User unbanned' });
});

router.post('/users/:id/fund', (req, res) => {
  const { amount, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.params.id);
  if (!wallet) return res.status(404).json({ success: false, message: 'User wallet not found' });

  db.prepare('UPDATE wallets SET balance = balance + ? WHERE user_id = ?').run(amount, req.params.id);
  db.prepare(
    `INSERT INTO transactions (user_id, type, amount, reference, status, channel, description) VALUES (?,?,?,?,?,?,?)`
  ).run(req.params.id, 'admin_credit', amount, `ADMIN_${Date.now()}`, 'success', 'admin', description || 'Manual wallet credit by admin');

  res.json({ success: true, message: `₦${amount} credited to user wallet` });
});

// ---------------- MANAGE PRODUCTS ----------------
router.get('/products', (req, res) => {
  res.json({ success: true, products: db.prepare('SELECT * FROM products ORDER BY id DESC').all() });
});

router.post('/products', (req, res) => {
  const { name, description, price, image, category, stock } = req.body;
  if (!name || !price) return res.status(400).json({ success: false, message: 'name and price are required' });
  const result = db
    .prepare('INSERT INTO products (name, description, price, image, category, stock) VALUES (?,?,?,?,?,?)')
    .run(name, description || '', price, image || '', category || 'General', stock ?? 100);
  res.status(201).json({ success: true, message: 'Product added', id: result.lastInsertRowid });
});

router.put('/products/:id', (req, res) => {
  const { name, description, price, image, category, stock } = req.body;
  db.prepare('UPDATE products SET name=?, description=?, price=?, image=?, category=?, stock=? WHERE id=?')
    .run(name, description, price, image, category, stock, req.params.id);
  res.json({ success: true, message: 'Product updated' });
});

router.delete('/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Product deleted' });
});

// ---------------- MANAGE VTU PRICES ----------------
router.get('/vtu-prices', (req, res) => {
  res.json({ success: true, prices: db.prepare('SELECT * FROM vtu_prices ORDER BY network, price').all() });
});

router.post('/vtu-prices', (req, res) => {
  const { network, plan_type, size, validity, price } = req.body;
  const result = db
    .prepare('INSERT INTO vtu_prices (network, plan_type, size, validity, price) VALUES (?,?,?,?,?)')
    .run(network, plan_type, size, validity, price);
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

router.put('/vtu-prices/:id', (req, res) => {
  const { network, plan_type, size, validity, price } = req.body;
  db.prepare('UPDATE vtu_prices SET network=?, plan_type=?, size=?, validity=?, price=? WHERE id=?')
    .run(network, plan_type, size, validity, price, req.params.id);
  res.json({ success: true, message: 'Price updated' });
});

router.delete('/vtu-prices/:id', (req, res) => {
  db.prepare('DELETE FROM vtu_prices WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Deleted' });
});

// ---------------- MANAGE ORDERS ----------------
router.get('/orders', (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.*, u.name as customer_name, u.email as customer_email FROM orders o
       JOIN users u ON u.id = o.user_id ORDER BY o.id DESC`
    )
    .all()
    .map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json({ success: true, orders });
});

router.patch('/orders/:id/status', (req, res) => {
  const { status } = req.body; // Pending | Processing | Delivered | Cancelled
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true, message: `Order marked as ${status}` });
});

// ---------------- MANAGE TRANSACTIONS ----------------
router.get('/transactions', (req, res) => {
  const txs = db
    .prepare(
      `SELECT t.*, u.name as user_name, u.email as user_email FROM transactions t
       JOIN users u ON u.id = t.user_id ORDER BY t.id DESC`
    )
    .all();
  res.json({ success: true, transactions: txs });
});

// ---------------- SITE SETTINGS ----------------
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => (settings[r.key] = r.value));
  res.json({ success: true, settings });
});

router.put('/settings', (req, res) => {
  const updates = req.body; // { key: value, ... }
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  Object.entries(updates).forEach(([k, v]) => stmt.run(k, String(v)));
  res.json({ success: true, message: 'Settings updated' });
});

module.exports = router;
