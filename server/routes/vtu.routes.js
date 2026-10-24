// routes/vtu.routes.js - REAL airtime / data / cable / electricity delivery via VTpass
const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const vtpass = require('../utils/vtpass');

const router = express.Router();

// ---------- SETTINGS (all tunable from .env) ----------
const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const dataMarkupPercent = () => num(process.env.DATA_MARKUP_PERCENT, 5); // % added on top of VTpass data price
const cableMarkup = () => num(process.env.CABLE_MARKUP, 0); // flat ₦ added on top of VTpass cable price
const AIRTIME_MIN = () => num(process.env.AIRTIME_MIN, 50);
const AIRTIME_MAX = () => num(process.env.AIRTIME_MAX, 50000);
const ELECTRICITY_MIN = () => num(process.env.ELECTRICITY_MIN, 500);
const ELECTRICITY_MAX = () => num(process.env.ELECTRICITY_MAX, 100000);

const UNAVAILABLE = { success: false, message: 'This service is temporarily unavailable. Please try again shortly.' };

// ---------- HELPERS ----------
function normalizePhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('234') && d.length === 13) d = '0' + d.slice(3);
  return /^0[789][01]\d{8}$/.test(d) ? d : null;
}

const inFlight = new Set(); // user ids with a purchase currently being processed (blocks double-clicks)
const activeRefs = new Set(); // references currently being processed (so the re-checker leaves them alone)

function walletBalance(userId) {
  const w = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(userId);
  return w ? w.balance : 0;
}

// Atomically take money from the wallet AND record the (pending) transaction.
const debitAndRecord = db.transaction((p) => {
  const r = db
    .prepare("UPDATE wallets SET balance = balance - ?, updated_at = datetime('now') WHERE user_id = ? AND balance >= ?")
    .run(p.amount, p.userId, p.amount);
  if (r.changes === 0) return false;
  db.prepare(
    `INSERT INTO vtu_transactions (user_id, type, network, phone, plan, amount, status, reference, updated_at)
     VALUES (?,?,?,?,?,?,?,?, datetime('now'))`
  ).run(p.userId, p.type, p.network, p.target, p.plan, p.amount, 'pending', p.reference);
  db.prepare(
    `INSERT INTO transactions (user_id, type, amount, reference, status, channel, description) VALUES (?,?,?,?,?,?,?)`
  ).run(p.userId, p.type, p.amount, p.reference, 'pending', 'wallet', p.description);
  return true;
});

// pending -> success (idempotent)
const settleSuccess = db.transaction((reference, info) => {
  const r = db
    .prepare(
      `UPDATE vtu_transactions SET status='success', token=?, provider_ref=?, provider_message=?, cost=?, updated_at=datetime('now')
       WHERE reference=? AND status='pending'`
    )
    .run(info.token, info.providerRef, info.message, info.cost, reference);
  if (r.changes === 1) db.prepare("UPDATE transactions SET status='success' WHERE reference=?").run(reference);
  return r.changes === 1;
});

// pending -> failed + automatic wallet refund (idempotent: can only ever refund once)
const settleFailed = db.transaction((reference, message) => {
  const row = db.prepare("SELECT * FROM vtu_transactions WHERE reference=? AND status='pending'").get(reference);
  if (!row) return false;
  db.prepare(
    "UPDATE vtu_transactions SET status='failed', provider_message=?, updated_at=datetime('now') WHERE reference=? AND status='pending'"
  ).run(message || null, reference);
  db.prepare("UPDATE transactions SET status='failed' WHERE reference=?").run(reference);
  db.prepare("UPDATE wallets SET balance = balance + ?, updated_at = datetime('now') WHERE user_id = ?").run(row.amount, row.user_id);
  db.prepare(
    `INSERT INTO transactions (user_id, type, amount, reference, status, channel, description) VALUES (?,?,?,?,?,?,?)`
  ).run(row.user_id, 'refund', row.amount, `${reference}_REFUND`, 'success', 'wallet', `Refund for failed ${row.type} purchase`);
  return true;
});

// Verify a smartcard / meter number with VTpass. Returns { ok, customer } or { ok:false, unavailable? }
async function verifyBiller(serviceID, billersCode, type) {
  try {
    const payload = { serviceID, billersCode };
    if (type) payload.type = type;
    const r = await vtpass.verify(payload);
    const c = r.content || {};
    if (String(r.code) !== '000' || c.error || !c.Customer_Name) return { ok: false };
    return {
      ok: true,
      customer: {
        name: c.Customer_Name,
        address: c.Address || null,
        status: c.Status || null,
        bouquet: c.Current_Bouquet || null,
        dueDate: c.Due_Date || null,
      },
    };
  } catch (e) {
    return { ok: false, unavailable: true };
  }
}

// ---------- CORE: charge wallet -> deliver via VTpass -> settle ----------
async function vend(req, res, spec) {
  if (!vtpass.isConfigured()) return res.status(503).json(UNAVAILABLE);
  const userId = req.user.id;
  if (inFlight.has(userId)) {
    return res.status(429).json({ success: false, message: 'You have a purchase in progress. Please wait a moment.' });
  }
  inFlight.add(userId);
  const reference = vtpass.newRequestId();
  activeRefs.add(reference);

  try {
    const charged = debitAndRecord({
      userId, amount: spec.amount, type: spec.type, network: spec.network, target: spec.target,
      plan: spec.plan, reference, description: spec.description,
    });
    if (!charged) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance. Please fund your wallet.' });
    }

    let outcome;
    let data = null;
    try {
      data = await vtpass.pay({ request_id: reference, serviceID: spec.serviceID, ...spec.body });
      outcome = vtpass.classify(data);
    } catch (e) {
      console.error(`VTpass pay error [${reference}]:`, e.message);
      outcome = 'pending'; // we can't be sure it failed -> never refund blindly; the re-checker resolves it
    }

    if (outcome === 'success') {
      const info = vtpass.parse(data);
      settleSuccess(reference, info);
      return res.json({
        success: true, message: spec.successMessage, token: info.token || undefined,
        balance: walletBalance(userId), reference,
      });
    }

    if (outcome === 'failed') {
      console.error(`VTpass FAILED [${reference}] code=${data && data.code} desc=${data && data.response_description}`);
      settleFailed(reference, data && data.response_description);
      return res.status(400).json({
        success: false,
        message: 'Transaction failed and your wallet has been refunded. Please try again or contact support.',
        balance: walletBalance(userId), reference,
      });
    }

    // pending
    return res.status(202).json({
      success: true, pending: true,
      message: 'Your order is being processed. Check your history in a few minutes. If it fails, you are refunded automatically.',
      balance: walletBalance(userId), reference,
    });
  } catch (err) {
    console.error(`vend error [${reference}]:`, err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. If your wallet was debited, it will be resolved automatically.',
    });
  } finally {
    inFlight.delete(userId);
    activeRefs.delete(reference);
  }
}

// ======================================================================
// PUBLIC
// ======================================================================

// Data plans shown on the VTU page + buy page (cost price is never exposed)
router.get('/data-plans', (req, res) => {
  const where = vtpass.isConfigured() ? 'WHERE vtpass_code IS NOT NULL' : '';
  const plans = db
    .prepare(`SELECT id, network, plan_type, size, validity, price FROM vtu_prices ${where} ORDER BY network, price`)
    .all();
  res.json({ success: true, plans });
});

// Cable plans come live from VTpass (cached 10 min) so prices are always right
const cableCache = {};
async function getCablePlans(provider) {
  const hit = cableCache[provider];
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.plans;
  try {
    const r = await vtpass.variations(vtpass.CABLE_SERVICE[provider]);
    const plans = vtpass
      .variationsOf(r)
      .map((v) => ({ code: v.variation_code, name: v.name, cost: Number(v.variation_amount) }))
      .filter((p) => p.code && p.cost > 0);
    if (plans.length) {
      cableCache[provider] = { at: Date.now(), plans };
      return plans;
    }
  } catch (e) {
    console.error('Cable plans fetch failed:', e.message);
  }
  return hit ? hit.plans : [];
}

router.get('/cable-plans/:provider', async (req, res) => {
  const provider = String(req.params.provider).toUpperCase();
  if (!vtpass.CABLE_SERVICE[provider]) return res.status(400).json({ success: false, message: 'Unknown provider' });
  if (!vtpass.isConfigured()) return res.status(503).json(UNAVAILABLE);
  const plans = await getCablePlans(provider);
  res.json({
    success: true,
    plans: plans.map((p) => ({ code: p.code, name: p.name, price: Math.ceil(p.cost + cableMarkup()) })),
  });
});

// ======================================================================
// VERIFY (so customers don't pay the wrong smartcard / meter)
// ======================================================================
router.post('/verify-smartcard', requireAuth, async (req, res) => {
  const provider = String(req.body.provider || '').toUpperCase();
  const smartcard = String(req.body.smartcard || '').replace(/\s/g, '');
  const serviceID = vtpass.CABLE_SERVICE[provider];
  if (!serviceID || !/^\d{8,15}$/.test(smartcard)) {
    return res.status(400).json({ success: false, message: 'Enter a valid smartcard / IUC number' });
  }
  if (!vtpass.isConfigured()) return res.status(503).json(UNAVAILABLE);
  const v = await verifyBiller(serviceID, smartcard);
  if (v.unavailable) return res.status(503).json(UNAVAILABLE);
  if (!v.ok) return res.status(400).json({ success: false, message: 'Could not verify this smartcard number. Please check and try again.' });
  res.json({ success: true, customer: v.customer });
});

router.post('/verify-meter', requireAuth, async (req, res) => {
  const disco = String(req.body.disco || '').toUpperCase();
  const meterNumber = String(req.body.meterNumber || '').replace(/\s/g, '');
  const type = String(req.body.meterType || '').toLowerCase();
  const serviceID = vtpass.DISCO_SERVICE[disco];
  if (!serviceID || !/^\d{6,20}$/.test(meterNumber) || !['prepaid', 'postpaid'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Enter a valid disco, meter type and meter number' });
  }
  if (!vtpass.isConfigured()) return res.status(503).json(UNAVAILABLE);
  const v = await verifyBiller(serviceID, meterNumber, type);
  if (v.unavailable) return res.status(503).json(UNAVAILABLE);
  if (!v.ok) return res.status(400).json({ success: false, message: 'Could not verify this meter number. Please check and try again.' });
  res.json({ success: true, customer: v.customer });
});

// ======================================================================
// PURCHASES (login required)
// ======================================================================

// Buy Data
router.post('/buy-data', requireAuth, async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const planId = Number(req.body.planId);
  if (!phone || !planId) return res.status(400).json({ success: false, message: 'A valid phone number and plan are required' });

  const plan = db.prepare('SELECT * FROM vtu_prices WHERE id = ?').get(planId);
  if (!plan) return res.status(404).json({ success: false, message: 'Data plan not found' });
  if (!plan.vtpass_code || !plan.service_id) {
    return res.status(400).json({ success: false, message: 'This plan is currently unavailable. Please choose another.' });
  }
  // Safety: never sell below what VTpass charges us
  if (!(plan.price > 0) || plan.price < plan.cost_price) {
    console.error(`Plan ${plan.id} price (${plan.price}) is below cost (${plan.cost_price}) - blocked`);
    return res.status(400).json({ success: false, message: 'This plan is currently unavailable. Please choose another.' });
  }

  return vend(req, res, {
    type: 'data', network: plan.network, target: phone, plan: `${plan.size} (${plan.validity})`,
    amount: plan.price, serviceID: plan.service_id,
    body: { billersCode: phone, variation_code: plan.vtpass_code, phone },
    description: `${plan.network} ${plan.size} data for ${phone}`,
    successMessage: `${plan.size} data sent to ${phone}`,
  });
});

// Buy Airtime
router.post('/buy-airtime', requireAuth, async (req, res) => {
  const network = String(req.body.network || '').toUpperCase();
  const phone = normalizePhone(req.body.phone);
  const amount = Number(req.body.amount);
  const serviceID = vtpass.AIRTIME_SERVICE[network];
  if (!serviceID || !phone) return res.status(400).json({ success: false, message: 'A valid network and phone number are required' });
  if (!Number.isInteger(amount) || amount < AIRTIME_MIN() || amount > AIRTIME_MAX()) {
    return res.status(400).json({ success: false, message: `Airtime amount must be between ₦${AIRTIME_MIN()} and ₦${AIRTIME_MAX().toLocaleString()}` });
  }

  return vend(req, res, {
    type: 'airtime', network, target: phone, plan: 'Airtime Top-up', amount, serviceID,
    body: { amount, phone },
    description: `${network} airtime for ${phone}`,
    successMessage: `₦${amount} airtime sent to ${phone}`,
  });
});

// Buy Cable Subscription (price is looked up on the server - never trusted from the browser)
router.post('/buy-cable', requireAuth, async (req, res) => {
  const provider = String(req.body.provider || '').toUpperCase();
  const smartcard = String(req.body.smartcard || '').replace(/\s/g, '');
  const planCode = String(req.body.planCode || '');
  const serviceID = vtpass.CABLE_SERVICE[provider];
  if (!serviceID || !/^\d{8,15}$/.test(smartcard) || !planCode) {
    return res.status(400).json({ success: false, message: 'provider, smartcard and plan are required' });
  }
  if (!vtpass.isConfigured()) return res.status(503).json(UNAVAILABLE);

  const phone = normalizePhone(req.user.phone);
  if (!phone) return res.status(400).json({ success: false, message: 'Please add a valid phone number to your profile first.' });

  const plan = (await getCablePlans(provider)).find((p) => p.code === planCode);
  if (!plan) return res.status(400).json({ success: false, message: 'That plan is no longer available. Please reselect.' });

  const v = await verifyBiller(serviceID, smartcard);
  if (v.unavailable) return res.status(503).json(UNAVAILABLE);
  if (!v.ok) return res.status(400).json({ success: false, message: 'Invalid smartcard number. Please check and try again.' });

  const body = { billersCode: smartcard, variation_code: plan.code, phone };
  if (provider === 'DSTV' || provider === 'GOTV') body.subscription_type = 'change';

  return vend(req, res, {
    type: 'cable', network: provider, target: smartcard, plan: plan.name,
    amount: Math.ceil(plan.cost + cableMarkup()), serviceID, body,
    description: `${provider} ${plan.name} for ${smartcard}`,
    successMessage: `${provider} ${plan.name} subscription successful`,
  });
});

// Pay Electricity Bill
router.post('/buy-electricity', requireAuth, async (req, res) => {
  const disco = String(req.body.disco || '').toUpperCase();
  const meterNumber = String(req.body.meterNumber || '').replace(/\s/g, '');
  const meterType = String(req.body.meterType || '').toLowerCase();
  const amount = Number(req.body.amount);
  const serviceID = vtpass.DISCO_SERVICE[disco];
  if (!serviceID || !/^\d{6,20}$/.test(meterNumber) || !['prepaid', 'postpaid'].includes(meterType)) {
    return res.status(400).json({ success: false, message: 'disco, meterNumber and meterType are required' });
  }
  if (!Number.isInteger(amount) || amount < ELECTRICITY_MIN() || amount > ELECTRICITY_MAX()) {
    return res.status(400).json({ success: false, message: `Amount must be between ₦${ELECTRICITY_MIN().toLocaleString()} and ₦${ELECTRICITY_MAX().toLocaleString()}` });
  }
  if (!vtpass.isConfigured()) return res.status(503).json(UNAVAILABLE);

  const phone = normalizePhone(req.user.phone);
  if (!phone) return res.status(400).json({ success: false, message: 'Please add a valid phone number to your profile first.' });

  const v = await verifyBiller(serviceID, meterNumber, meterType);
  if (v.unavailable) return res.status(503).json(UNAVAILABLE);
  if (!v.ok) return res.status(400).json({ success: false, message: 'Invalid meter number. Please check and try again.' });

  const label = meterType.charAt(0).toUpperCase() + meterType.slice(1);
  return vend(req, res, {
    type: 'electricity', network: disco, target: meterNumber, plan: label, amount, serviceID,
    body: { billersCode: meterNumber, variation_code: meterType, amount, phone },
    description: `${disco} ${label} bill for ${meterNumber}`,
    successMessage: 'Electricity payment successful',
  });
});

// VTU transaction history for logged-in user
router.get('/history', requireAuth, (req, res) => {
  const history = db
    .prepare(
      `SELECT id, type, network, phone, plan, amount, status, reference, token, created_at
       FROM vtu_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 100`
    )
    .all(req.user.id);
  res.json({ success: true, history });
});

// ======================================================================
// PENDING RE-CHECKER  (resolves orders that VTpass was still processing)
// ======================================================================
async function resolvePending(reference) {
  const data = await vtpass.requery(reference);
  const outcome = vtpass.classify(data);
  if (outcome === 'success') settleSuccess(reference, vtpass.parse(data));
  else if (outcome === 'failed') settleFailed(reference, data && data.response_description);
  return outcome;
}

async function requeryPending() {
  if (!vtpass.isConfigured()) return;
  const rows = db
    .prepare(
      `SELECT reference FROM vtu_transactions
       WHERE status='pending' AND datetime(created_at) <= datetime('now','-90 seconds') AND datetime(created_at) >= datetime('now','-7 days')
       ORDER BY id LIMIT 50`
    )
    .all();
  for (const { reference } of rows) {
    if (activeRefs.has(reference)) continue;
    try {
      await resolvePending(reference);
    } catch (e) {
      console.error(`Requery failed [${reference}]:`, e.message); // try again next cycle
    }
  }
}

// VTpass can POST status updates here. We never trust the body: we re-query VTpass ourselves.
router.post('/vtpass-webhook', async (req, res) => {
  try {
    const requestId = req.body && req.body.data && req.body.data.requestId;
    if (requestId && /^[A-Za-z0-9_-]{12,64}$/.test(String(requestId)) && !activeRefs.has(requestId)) {
      const row = db.prepare("SELECT reference FROM vtu_transactions WHERE reference=? AND status='pending'").get(requestId);
      if (row) await resolvePending(requestId);
    }
  } catch (e) {
    console.error('VTpass webhook error:', e.message);
  }
  res.json({ response: 'success' });
});

// ======================================================================
// DATA PLAN SYNC  (pulls real plans + prices from VTpass, applies your markup)
// ======================================================================
function parsePlan(name = '') {
  const size = (name.match(/(\d+(?:\.\d+)?\s?(?:TB|GB|MB))/i) || [])[1];
  const validity = (name.match(/(\d+\s?(?:days?|weeks?|months?|hours?|hrs?)|daily|weekly|monthly|yearly)/i) || [])[1];
  const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    size: size ? size.replace(/\s+/g, '').toUpperCase() : String(name).trim(),
    validity: validity ? title(validity.toLowerCase()) : 'See plan',
  };
}

const sellPrice = (cost) => Math.ceil((cost * (1 + dataMarkupPercent() / 100)) / 5) * 5;

async function syncPlans() {
  if (!vtpass.isConfigured()) return { skipped: 'VTpass keys not set' };
  const report = {};
  for (const [network, serviceID] of Object.entries(vtpass.DATA_SERVICE)) {
    let list;
    try {
      list = vtpass.variationsOf(await vtpass.variations(serviceID));
    } catch (e) {
      report[network] = `fetch failed: ${e.message}`;
      continue;
    }
    if (!list.length) {
      report[network] = 'no plans returned (existing plans left untouched)';
      continue;
    }

    const apply = db.transaction(() => {
      db.prepare('DELETE FROM vtu_prices WHERE network = ? AND vtpass_code IS NULL').run(network); // old demo plans
      const seen = [];
      for (const v of list) {
        const cost = Number(v.variation_amount);
        if (!v.variation_code || !(cost > 0)) continue;
        const { size, validity } = parsePlan(v.name);
        const existing = db.prepare('SELECT id, price FROM vtu_prices WHERE service_id = ? AND vtpass_code = ?').get(serviceID, v.variation_code);
        if (existing) {
          // keep a price you set manually as long as it still covers cost
          const price = existing.price >= cost ? existing.price : sellPrice(cost);
          db.prepare('UPDATE vtu_prices SET cost_price=?, price=?, size=?, validity=? WHERE id=?').run(cost, price, size, validity, existing.id);
        } else {
          db.prepare(
            'INSERT INTO vtu_prices (network, plan_type, size, validity, price, vtpass_code, service_id, cost_price) VALUES (?,?,?,?,?,?,?,?)'
          ).run(network, /sme/i.test(v.name) ? 'SME' : 'DATA', size, validity, sellPrice(cost), v.variation_code, serviceID, cost);
        }
        seen.push(v.variation_code);
      }
      if (seen.length) {
        db.prepare(`DELETE FROM vtu_prices WHERE service_id = ? AND vtpass_code IS NOT NULL AND vtpass_code NOT IN (${seen.map(() => '?').join(',')})`).run(serviceID, ...seen);
      }
      return seen.length;
    });
    report[network] = `${apply()} plans synced`;
  }
  return report;
}

// ======================================================================
// ADMIN UTILITIES
// ======================================================================
router.post('/admin/sync-plans', requireAdmin, async (req, res) => {
  res.json({ success: true, report: await syncPlans() });
});

router.post('/admin/requery-pending', requireAdmin, async (req, res) => {
  await requeryPending();
  const left = db.prepare("SELECT COUNT(*) AS c FROM vtu_transactions WHERE status='pending'").get().c;
  res.json({ success: true, stillPending: left });
});

router.get('/admin/provider-balance', requireAdmin, async (req, res) => {
  try {
    const r = await vtpass.balance();
    res.json({ success: true, balance: r.contents ? r.contents.balance : null });
  } catch (e) {
    res.status(503).json({ success: false, message: 'Could not reach VTpass' });
  }
});

// ---------- BACKGROUND JOBS ----------
// 1) sync plans shortly after boot and every 6 hours   2) re-check pending orders every 2 minutes
setTimeout(() => syncPlans().then((r) => console.log('✔ VTpass plan sync:', JSON.stringify(r))).catch((e) => console.error('Plan sync failed:', e.message)), 5000).unref();
setInterval(() => syncPlans().catch((e) => console.error('Plan sync failed:', e.message)), 6 * 60 * 60 * 1000).unref();
setInterval(() => requeryPending().catch((e) => console.error('Requery job failed:', e.message)), 2 * 60 * 1000).unref();

module.exports = router;
