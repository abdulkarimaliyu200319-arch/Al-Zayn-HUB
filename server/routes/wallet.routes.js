const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { startPayment, settleByReference } = require('../utils/payments');
const { generateReference } = require('../utils/otp');

const router = express.Router();

// Get wallet balance
router.get('/balance', requireAuth, (req, res) => {
  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
  res.json({ success: true, balance: wallet ? wallet.balance : 0 });
});

// Start a Monnify payment to fund the wallet
router.post('/fund/initialize', requireAuth, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 100) {
    return res.status(400).json({ success: false, message: 'Minimum funding amount is ₦100' });
  }
  if (amount > 1000000) {
    return res.status(400).json({ success: false, message: 'Maximum funding amount is ₦1,000,000' });
  }

  const reference = generateReference('FUND');
  const r = await startPayment({
    user: req.user, type: 'fund', amount, reference, description: 'Wallet funding via Monnify',
  });
  if (!r.ok) return res.status(r.status || 400).json({ success: false, message: r.message });

  // authorization_url kept as the field name so the existing frontend keeps working
  res.json({ success: true, authorization_url: r.checkoutUrl, reference });
});

// Check a payment after the customer returns from Monnify (the webhook does the same in the background).
// Works for wallet funding, shop orders and VPN purchases alike.
router.get('/fund/verify/:reference', requireAuth, async (req, res) => {
  const r = await settleByReference(req.params.reference, req.user.id);
  if (r.ok) return res.json({ success: true, message: r.message, balance: r.balance, type: r.type });
  if (r.pending) return res.status(202).json({ success: false, pending: true, message: r.message });
  res.status(r.status || 400).json({ success: false, message: r.message });
});

// Transaction history
router.get('/transactions', requireAuth, (req, res) => {
  const txs = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ success: true, transactions: txs });
});

module.exports = router;
