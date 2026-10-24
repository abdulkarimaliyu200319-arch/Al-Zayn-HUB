// utils/monnify.js - Monnify (hosted checkout) client: card, bank transfer & USSD in one page.
// Docs: https://developers.monnify.com
const fetch = require('node-fetch');

function baseUrl() {
  if (process.env.MONNIFY_BASE_URL) return process.env.MONNIFY_BASE_URL.replace(/\/$/, '');
  return (process.env.MONNIFY_ENV || 'sandbox').toLowerCase() === 'live'
    ? 'https://api.monnify.com'
    : 'https://sandbox.monnify.com';
}

function isConfigured() {
  return !!(process.env.MONNIFY_API_KEY && process.env.MONNIFY_SECRET_KEY && process.env.MONNIFY_CONTRACT_CODE);
}

// ---- auth: Basic(apiKey:secretKey) -> bearer token (valid 1 hour, cached) ----
let tokenCache = { token: null, expiresAt: 0 };

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const basic = Buffer.from(`${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString('base64');
  const res = await fetch(`${baseUrl()}/api/v1/auth/login`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` },
    timeout: 30000,
  });
  const json = await res.json().catch(() => ({}));
  const body = json.responseBody || {};
  if (!json.requestSuccessful || !body.accessToken) {
    throw new Error(`Monnify login failed: ${json.responseMessage || res.status}`);
  }
  const ttl = Math.max(60, Number(body.expiresIn || 3600) - 120); // refresh 2 min early
  tokenCache = { token: body.accessToken, expiresAt: Date.now() + ttl * 1000 };
  return tokenCache.token;
}

async function api(method, path, body) {
  const doCall = async () => {
    const token = await getToken();
    const res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      timeout: 45000,
    });
    return { res, json: await res.json().catch(() => ({})) };
  };
  let { res, json } = await doCall();
  if (res.status === 401) { // token expired early -> log in again once
    tokenCache = { token: null, expiresAt: 0 };
    ({ res, json } = await doCall());
  }
  return json;
}

// Create a payment. amount is in NAIRA (Monnify does not use kobo).
// Returns { ok, checkoutUrl, transactionReference, message }
async function initTransaction({ amount, customerName, customerEmail, reference, description, redirectUrl, metaData }) {
  const payload = {
    amount: Number(amount),
    customerName: customerName || customerEmail,
    customerEmail,
    paymentReference: reference,
    paymentDescription: description || 'Payment',
    currencyCode: 'NGN',
    contractCode: process.env.MONNIFY_CONTRACT_CODE,
    redirectUrl,
    metaData: metaData || undefined,
  };
  const json = await api('POST', '/api/v1/merchant/transactions/init-transaction', payload);
  const b = json.responseBody;
  if (!json.requestSuccessful || !b || !b.checkoutUrl) {
    return { ok: false, message: json.responseMessage || 'Could not start payment' };
  }
  // Monnify advises confirming the response matches what we asked for
  if (b.paymentReference && b.paymentReference !== reference) {
    return { ok: false, message: 'Payment reference mismatch' };
  }
  return { ok: true, checkoutUrl: b.checkoutUrl, transactionReference: b.transactionReference };
}

// Ask Monnify directly what happened to a payment (never trust the browser / redirect).
// Returns { ok, status, amountPaid, paymentReference } - status is Monnify's paymentStatus (PAID, PENDING, FAILED...)
async function verifyTransaction(transactionReference) {
  const json = await api('GET', `/api/v2/transactions/${encodeURIComponent(transactionReference)}`);
  const b = json.responseBody;
  if (!json.requestSuccessful || !b) return { ok: false, message: json.responseMessage || 'Could not verify payment' };
  return {
    ok: true,
    status: String(b.paymentStatus || '').toUpperCase(),
    amountPaid: Number(b.amountPaid),
    paymentReference: b.paymentReference,
    transactionReference: b.transactionReference,
  };
}

module.exports = { isConfigured, initTransaction, verifyTransaction };
