// utils/vtpass.js - VTpass API client (airtime, data, cable TV, electricity)
// Docs: https://www.vtpass.com/documentation/
const fetch = require('node-fetch');
const crypto = require('crypto');

// ---------- CONFIG (read lazily so .env is always loaded first) ----------
function baseUrl() {
  if (process.env.VTPASS_BASE_URL) return process.env.VTPASS_BASE_URL.replace(/\/$/, '');
  return (process.env.VTPASS_ENV || 'sandbox').toLowerCase() === 'live'
    ? 'https://vtpass.com/api'
    : 'https://sandbox.vtpass.com/api';
}

function isConfigured() {
  return !!(process.env.VTPASS_API_KEY && process.env.VTPASS_PUBLIC_KEY && process.env.VTPASS_SECRET_KEY);
}

// ---------- SERVICE MAPS (our names -> VTpass serviceIDs) ----------
const AIRTIME_SERVICE = { MTN: 'mtn', GLO: 'glo', AIRTEL: 'airtel', '9MOBILE': 'etisalat' };
const DATA_SERVICE = { MTN: 'mtn-data', GLO: 'glo-data', AIRTEL: 'airtel-data', '9MOBILE': 'etisalat-data' };
const CABLE_SERVICE = { DSTV: 'dstv', GOTV: 'gotv', STARTIMES: 'startimes' };
const DISCO_SERVICE = {
  EKEDC: 'eko-electric',
  IKEDC: 'ikeja-electric',
  AEDC: 'abuja-electric',
  PHEDC: 'portharcourt-electric',
  KEDCO: 'kano-electric',
  IBEDC: 'ibadan-electric',
  EEDC: 'enugu-electric',
  JED: 'jos-electric',
  KAEDCO: 'kaduna-electric',
  BEDC: 'benin-electric',
  YEDC: 'yola-electric',
};

// ---------- REQUEST ID ----------
// VTpass requires: first 12 chars = YYYYMMDDHHmm in Africa/Lagos time (GMT+1), then any alphanumerics.
function newRequestId() {
  const lagos = new Date(Date.now() + 60 * 60 * 1000); // Nigeria is UTC+1 all year (no DST)
  const p = (n) => String(n).padStart(2, '0');
  const stamp =
    `${lagos.getUTCFullYear()}${p(lagos.getUTCMonth() + 1)}${p(lagos.getUTCDate())}` +
    `${p(lagos.getUTCHours())}${p(lagos.getUTCMinutes())}`;
  return stamp + crypto.randomBytes(5).toString('hex').toUpperCase();
}

// ---------- HTTP ----------
// Throws an error with .network = true when we cannot be sure whether VTpass received the request.
async function call(method, path, data) {
  const headers = { 'api-key': process.env.VTPASS_API_KEY, 'Content-Type': 'application/json' };
  if (method === 'GET') headers['public-key'] = process.env.VTPASS_PUBLIC_KEY;
  else headers['secret-key'] = process.env.VTPASS_SECRET_KEY;

  let url = `${baseUrl()}${path}`;
  const opts = { method, headers, timeout: 60000 };
  if (method === 'GET' && data) url += `?${new URLSearchParams(data).toString()}`;
  if (method === 'POST') opts.body = JSON.stringify(data || {});

  let res;
  try {
    res = await fetch(url, opts);
  } catch (e) {
    const err = new Error(`VTpass network error: ${e.message}`);
    err.network = true;
    throw err;
  }

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    const err = new Error(`VTpass returned non-JSON (HTTP ${res.status})`);
    err.network = true;
    throw err;
  }
  json._httpStatus = res.status;
  return json;
}

const pay = (payload) => call('POST', '/pay', payload);
const requery = (request_id) => call('POST', '/requery', { request_id });
const verify = (payload) => call('POST', '/merchant-verify', payload); // { serviceID, billersCode, type? }
const variations = (serviceID) => call('GET', '/service-variations', { serviceID });
const balance = () => call('GET', '/balance');

// VTpass spells it "varations" in some responses
function variationsOf(res) {
  const c = (res && res.content) || {};
  return c.varations || c.variations || [];
}

// ---------- RESULT CLASSIFICATION ----------
// 'success' | 'failed' | 'pending'.
// IMPORTANT: money is only refunded on a definite 'failed'. Anything uncertain stays 'pending'
// and is re-checked with /requery, so a customer can never be refunded for something delivered.
const FAILED_CODES = new Set([
  '010', '011', '012', '013', '015', '016', '017', '018', '021', '022', '023', '024', '027', '028',
  '030', '031', '032', '034', '035', '083',
]);

function classify(res) {
  if (!res || typeof res !== 'object') return 'pending';
  if (res._httpStatus >= 500) return 'pending';
  const code = String(res.code === undefined ? '' : res.code);
  const status = String((res.content && res.content.transactions && res.content.transactions.status) || '').toLowerCase();
  if (code === '000') {
    if (status === 'delivered') return 'success';
    if (status === 'failed' || status === 'reversed') return 'failed';
    return 'pending'; // initiated / pending
  }
  if (FAILED_CODES.has(code)) return 'failed';
  return 'pending'; // 099 (processing), 014 (duplicate id), unknown codes...
}

// Pull the useful bits out of a VTpass response
function parse(res) {
  const tx = (res && res.content && res.content.transactions) || {};
  let token = res && (res.purchased_code || res.token || res.Token || tx.token || '');
  token = String(token || '').replace(/token\s*:\s*/gi, '').trim();
  const cost = Number(tx.total_amount);
  return {
    token: token || null,
    providerRef: tx.transactionId ? String(tx.transactionId) : null,
    message: (res && res.response_description) || null,
    cost: Number.isFinite(cost) ? cost : null,
  };
}

module.exports = {
  isConfigured, newRequestId, pay, requery, verify, variations, balance, variationsOf, classify, parse,
  AIRTIME_SERVICE, DATA_SERVICE, CABLE_SERVICE, DISCO_SERVICE,
};
