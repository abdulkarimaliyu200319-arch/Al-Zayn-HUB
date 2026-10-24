// utils/payments.js - ONE place that starts online (Monnify) payments and safely settles them.
// Used by wallet funding, shop card-checkout and VPN card-payment, via the redirect check AND the webhook.
const db = require('../db');
const monnify = require('./monnify');
const { sendOrderConfirmationEmail } = require('./email');

function activateSubscription(userId, plan) {
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
  const configKey = `VLT-VPN-${userId}-${Date.now().toString(36).toUpperCase()}`;
  return db
    .prepare(
      `INSERT INTO vpn_subscriptions (user_id, plan_id, plan_name, expires_at, status, config_key) VALUES (?,?,?,?,?,?)`
    )
    .run(userId, plan.id, plan.name, expiresAt.toISOString(), 'active', configKey);
}

const DONE_MESSAGE = {
  fund: 'Wallet funded successfully',
  vpn: 'VPN subscription activated',
  shop: 'Payment verified, order confirmed',
};

function clientUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

// Record a pending transaction, then ask Monnify for a checkout page.
// Returns { ok, checkoutUrl } or { ok:false, status, message }
async function startPayment({ user, type, amount, reference, description, meta }) {
  if (!monnify.isConfigured()) {
    return { ok: false, status: 503, message: 'Online payment is temporarily unavailable. Please try again shortly.' };
  }
  db.prepare(
    `INSERT INTO transactions (user_id, type, amount, reference, status, channel, description, meta) VALUES (?,?,?,?,?,?,?,?)`
  ).run(user.id, type, amount, reference, 'pending', 'monnify', description, meta ? JSON.stringify(meta) : null);

  try {
    const r = await monnify.initTransaction({
      amount,
      customerName: user.name,
      customerEmail: user.email,
      reference,
      description,
      redirectUrl: `${clientUrl()}/dashboard/wallet?verify=1&ref=${encodeURIComponent(reference)}`,
    });
    if (!r.ok) {
      db.prepare("UPDATE transactions SET status='failed' WHERE reference=?").run(reference);
      return { ok: false, status: 400, message: r.message };
    }
    db.prepare('UPDATE transactions SET provider_ref=? WHERE reference=?').run(r.transactionReference || null, reference);
    return { ok: true, checkoutUrl: r.checkoutUrl };
  } catch (err) {
    console.error('Monnify init error:', err.message);
    db.prepare("UPDATE transactions SET status='failed' WHERE reference=?").run(reference);
    return { ok: false, status: 503, message: 'Could not start payment. Please try again.' };
  }
}

// pending/failed -> success exactly once, then deliver what was paid for (idempotent)
const fulfil = db.transaction((tx) => {
  const r = db.prepare("UPDATE transactions SET status='success' WHERE reference=? AND status!='success'").run(tx.reference);
  if (r.changes !== 1) return false; // someone else (webhook / redirect) already did it
  if (tx.type === 'fund') {
    db.prepare("UPDATE wallets SET balance = balance + ?, updated_at = datetime('now') WHERE user_id = ?").run(tx.amount, tx.user_id);
  } else if (tx.type === 'vpn') {
    const meta = JSON.parse(tx.meta || '{}');
    const plan = db.prepare('SELECT * FROM vpn_plans WHERE id = ?').get(meta.planId);
    if (plan) activateSubscription(tx.user_id, plan);
  } else if (tx.type === 'shop') {
    db.prepare("UPDATE orders SET status='Pending' WHERE reference=? AND status='Cancelled'").run(tx.reference);
  }
  return true;
});

// Ask Monnify what really happened, check the amount, and settle. Safe to call many times.
// userId (optional) restricts the lookup to that customer's own payment.
async function settleByReference(reference, userId) {
  const tx = db.prepare('SELECT * FROM transactions WHERE reference = ?').get(reference);
  if (!tx || tx.channel !== 'monnify' || (userId && tx.user_id !== userId)) {
    return { ok: false, status: 404, message: 'Transaction not found' };
  }
  const walletBal = () => (db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(tx.user_id) || {}).balance || 0;
  const done = (extra = {}) => ({ ok: true, type: tx.type, message: DONE_MESSAGE[tx.type] || 'Payment successful', balance: walletBal(), ...extra });

  if (tx.status === 'success') return done({ already: true });
  if (!tx.provider_ref) return { ok: false, status: 400, message: 'This payment was never started. Please try again.' };

  let v;
  try {
    v = await monnify.verifyTransaction(tx.provider_ref);
  } catch (err) {
    console.error('Monnify verify error:', err.message);
    return { ok: false, status: 503, message: 'Could not reach the payment provider. Please try again in a moment.' };
  }
  if (!v.ok) return { ok: false, status: 502, message: 'Could not confirm this payment yet. Please try again in a moment.' };
  if (v.paymentReference !== reference) {
    console.error(`Monnify reference mismatch: expected ${reference}, got ${v.paymentReference}`);
    return { ok: false, status: 400, message: 'Payment details do not match.' };
  }

  if (v.status === 'PAID' || v.status === 'OVERPAID') {
    if (!(v.amountPaid >= tx.amount)) {
      console.error(`Monnify amount too low for ${reference}: paid ${v.amountPaid}, expected ${tx.amount}`);
      return { ok: false, status: 400, message: 'The amount paid is less than expected. Please contact support.' };
    }
    const applied = fulfil(tx);
    if (applied && tx.type === 'shop') {
      try {
        const order = db.prepare('SELECT * FROM orders WHERE reference = ?').get(reference);
        const user = db.prepare('SELECT email FROM users WHERE id = ?').get(tx.user_id);
        if (order && user) sendOrderConfirmationEmail(user.email, order);
      } catch (e) { console.error('Order email failed:', e.message); }
    }
    if (applied) console.log(`✔ Monnify: ${tx.type} settled for user ${tx.user_id}, ₦${tx.amount} (${reference})`);
    return done();
  }

  if (['FAILED', 'EXPIRED', 'CANCELLED', 'ABANDONED'].includes(v.status)) {
    db.prepare("UPDATE transactions SET status='failed' WHERE reference=? AND status='pending'").run(reference);
    return { ok: false, status: 400, message: 'Payment was not completed.' };
  }

  // PENDING, PARTIALLY_PAID, REVERSED ... -> nothing delivered
  return { ok: false, pending: true, status: 202, message: 'Payment not confirmed yet. If you were debited, it will reflect shortly.' };
}

module.exports = { startPayment, settleByReference, activateSubscription };
