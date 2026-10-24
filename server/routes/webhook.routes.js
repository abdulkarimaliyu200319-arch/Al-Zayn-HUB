const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { settleByReference } = require('../utils/payments');

const router = express.Router();

// Monnify payment notifications.
// NOTE: needs the RAW body to check the signature - it is mounted with express.raw() in index.js BEFORE express.json().
// Monnify signs the body with HMAC-SHA512 using your Monnify SECRET KEY and sends it in the "monnify-signature" header.
router.post('/monnify', async (req, res) => {
  try {
    const secret = process.env.MONNIFY_SECRET_KEY;
    const signature = String(req.headers['monnify-signature'] || '');
    if (!secret || !Buffer.isBuffer(req.body)) return res.status(401).send('Invalid signature');

    const expected = crypto.createHmac('sha512', secret).update(req.body).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).send('Invalid signature');

    const event = JSON.parse(req.body.toString());
    if (event.eventType === 'SUCCESSFUL_TRANSACTION' && event.eventData) {
      const { paymentReference, transactionReference } = event.eventData;
      const tx = paymentReference && db.prepare('SELECT * FROM transactions WHERE reference = ?').get(paymentReference);
      if (tx && tx.channel === 'monnify') {
        if (!tx.provider_ref && transactionReference) {
          db.prepare('UPDATE transactions SET provider_ref = ? WHERE reference = ?').run(transactionReference, paymentReference);
        }
        // We never trust the webhook body for money: settleByReference re-checks with Monnify and verifies the amount.
        await settleByReference(paymentReference);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Monnify webhook error:', err);
    res.sendStatus(500); // Monnify will retry
  }
});

module.exports = router;
