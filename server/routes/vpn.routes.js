const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { generateReference } = require('../utils/otp');
const { startPayment, settleByReference, activateSubscription } = require('../utils/payments');

const router = express.Router();

// Get all VPN plans (public)
router.get('/plans', (req, res) => {
  const plans = db.prepare('SELECT * FROM vpn_plans').all().map(p => ({ ...p, features: JSON.parse(p.features || '[]') }));
  res.json({ success: true, plans });
});

// Get current user's active subscription
router.get('/my-subscription', requireAuth, (req, res) => {
  const sub = db
    .prepare('SELECT * FROM vpn_subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 1')
    .get(req.user.id);

  if (sub && new Date(sub.expires_at) < new Date() && sub.status === 'active') {
    db.prepare("UPDATE vpn_subscriptions SET status='expired' WHERE id = ?").run(sub.id);
    sub.status = 'expired';
  }

  res.json({ success: true, subscription: sub || null });
});

// Subscribe / Renew with WALLET
router.post('/subscribe/wallet', requireAuth, (req, res) => {
  const { planId } = req.body;
  const plan = db.prepare('SELECT * FROM vpn_plans WHERE id = ?').get(planId);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

  const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
  if (!wallet || wallet.balance < plan.price) {
    return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
  }

  db.prepare('UPDATE wallets SET balance = balance - ? WHERE user_id = ?').run(plan.price, req.user.id);
  activateSubscription(req.user.id, plan);

  const reference = generateReference('VPN');
  db.prepare(
    `INSERT INTO transactions (user_id, type, amount, reference, status, channel, description) VALUES (?,?,?,?,?,?,?)`
  ).run(req.user.id, 'vpn', plan.price, reference, 'success', 'wallet', `${plan.name} VPN plan (${plan.duration_days} days)`);

  const updatedWallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(req.user.id);
  res.json({ success: true, message: `${plan.name} VPN plan activated!`, balance: updatedWallet.balance });
});

// Subscribe with Monnify (card / bank transfer / USSD) - start payment
async function onlineSubscribe(req, res) {
  const { planId } = req.body;
  const plan = db.prepare('SELECT * FROM vpn_plans WHERE id = ?').get(planId);
  if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

  const reference = generateReference('VPNPAY');
  const r = await startPayment({
    user: req.user, type: 'vpn', amount: plan.price, reference,
    description: `${plan.name} VPN plan via Monnify`, meta: { planId: plan.id },
  });
  if (!r.ok) return res.status(r.status || 400).json({ success: false, message: r.message });
  res.json({ success: true, authorization_url: r.checkoutUrl, reference });
}

// Confirm an online VPN payment (also done automatically by the webhook) - activates the subscription once
async function onlineVerify(req, res) {
  const r = await settleByReference(req.params.reference, req.user.id);
  if (!r.ok) return res.status(r.status || 400).json({ success: false, pending: r.pending, message: r.message });
  res.json({ success: true, message: r.message });
}

router.post('/subscribe/online/initialize', requireAuth, onlineSubscribe);
router.post('/subscribe/paystack/initialize', requireAuth, onlineSubscribe); // old path kept so nothing breaks
router.get('/subscribe/online/verify/:reference', requireAuth, onlineVerify);
router.get('/subscribe/paystack/verify/:reference', requireAuth, onlineVerify);

module.exports = router;
