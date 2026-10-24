const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generateReference } = require('../utils/otp');
const { startPayment, settleByReference } = require('../utils/payments');
const { sendOrderConfirmationEmail } = require('../utils/email');

const router = express.Router();

// Get all products (public)
router.get('/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  res.json({ success: true, products });
});

router.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product });
});

function calculateTotal(items) {
  let total = 0;
  const resolvedItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
    if (!product) continue;
    const qty = Math.max(1, Number(item.qty) || 1);
    total += product.price * qty;
    resolvedItems.push({ product_id: product.id, name: product.name, qty, price: product.price });
  }
  return { total, resolvedItems };
}

// Checkout with WALLET
router.post('/checkout/wallet', requireAuth, (req, res) => {
  const { items, address } = req.body;
  if (!items || !items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

  const { total, resolvedItems } = calculateTotal(items);
  if (!resolvedItems.length) return res.status(400).json({ success: false, message: 'No valid products in cart' });

  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
  if (!wallet || wallet.balance < total) {
    return res.status(400).json({ success: false, message: 'Insufficient wallet balance. Please fund your wallet.' });
  }

  db.prepare('UPDATE wallets SET balance = balance - ? WHERE user_id = ?').run(total, req.user.id);

  const reference = generateReference('ORDER');
  const orderResult = db
    .prepare(`INSERT INTO orders (user_id, items, total, status, payment_channel, reference, address) VALUES (?,?,?,?,?,?,?)`)
    .run(req.user.id, JSON.stringify(resolvedItems), total, 'Pending', 'wallet', reference, address || '');

  db.prepare(
    `INSERT INTO transactions (user_id, type, amount, reference, status, channel, description) VALUES (?,?,?,?,?,?,?)`
  ).run(req.user.id, 'shop', total, reference, 'success', 'wallet', `Order #${orderResult.lastInsertRowid} - ${resolvedItems.length} item(s)`);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderResult.lastInsertRowid);
  sendOrderConfirmationEmail(req.user.email, order);

  const updatedWallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
  res.json({ success: true, message: 'Order placed successfully', order, balance: updatedWallet.balance });
});

// Checkout with Monnify (card / bank transfer / USSD) - start payment
async function onlineCheckout(req, res) {
  const { items, address } = req.body;
  if (!items || !items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

  const { total, resolvedItems } = calculateTotal(items);
  if (!resolvedItems.length) return res.status(400).json({ success: false, message: 'No valid products in cart' });

  const reference = generateReference('ORDERPAY');

  // Created as 'Cancelled' (= not paid yet) so unpaid orders are never shipped; it becomes 'Pending' once payment is confirmed.
  db.prepare(`INSERT INTO orders (user_id, items, total, status, payment_channel, reference, address) VALUES (?,?,?,?,?,?,?)`)
    .run(req.user.id, JSON.stringify(resolvedItems), total, 'Cancelled', 'monnify', reference, address || '');

  const r = await startPayment({
    user: req.user, type: 'shop', amount: total, reference, description: 'Shop order via Monnify',
  });
  if (!r.ok) return res.status(r.status || 400).json({ success: false, message: r.message });
  res.json({ success: true, authorization_url: r.checkoutUrl, reference });
}

// Verify an online shop payment (also done automatically by the webhook)
async function onlineVerify(req, res) {
  const r = await settleByReference(req.params.reference, req.user.id);
  if (!r.ok) return res.status(r.status || 400).json({ success: false, pending: r.pending, message: r.message });
  const order = db.prepare('SELECT * FROM orders WHERE reference = ?').get(req.params.reference);
  res.json({ success: true, message: r.message, order });
}

router.post('/checkout/online/initialize', requireAuth, onlineCheckout);
router.post('/checkout/paystack/initialize', requireAuth, onlineCheckout); // old path kept so nothing breaks
router.get('/checkout/online/verify/:reference', requireAuth, onlineVerify);
router.get('/checkout/paystack/verify/:reference', requireAuth, onlineVerify);

// Get my orders
router.get('/my-orders', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id)
    .map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json({ success: true, orders });
});

module.exports = router;
