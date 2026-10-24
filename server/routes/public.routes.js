const express = require('express');
const db = require('../db');
const router = express.Router();

// Public, non-sensitive settings needed by the frontend
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(r => (settings[r.key] = r.value));
  res.json({
    success: true,
    settings: {
      site_name: settings.site_name,
      whatsapp_number: settings.whatsapp_number,
      paystack_public_key: settings.paystack_public_key,
      referral_bonus: settings.referral_bonus,
    },
  });
});

module.exports = router;
