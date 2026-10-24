const fetch = require('node-fetch');

const PAYSTACK_BASE = 'https://api.paystack.co';

function secretKey() {
  return process.env.PAYSTACK_SECRET_KEY;
}

async function initializeTransaction({ email, amount, reference, metadata }) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100), // kobo
      reference,
      metadata,
      callback_url: `${process.env.CLIENT_URL}/dashboard/wallet?verify=1`,
    }),
  });
  return res.json();
}

async function verifyTransaction(reference) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  return res.json();
}

module.exports = { initializeTransaction, verifyTransaction };
