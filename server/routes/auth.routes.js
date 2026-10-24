const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { generateOtp, generateReferralCode } = require('../utils/otp');
const { sendOtpEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const { requireAuth } = require('../middleware/auth');
const { verifyGoogleIdToken } = require('../utils/googleAuth');

// Same normalisation the signup form uses, so a Google email matches an existing account
let normalizeEmail = (e) => String(e).trim().toLowerCase();
try {
  const validator = require('validator');
  normalizeEmail = (e) => validator.normalizeEmail(String(e)) || String(e).trim().toLowerCase();
} catch (_) { /* fall back to lowercase */ }

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ---------------- SIGNUP ----------------
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('phone').trim().isLength({ min: 10 }).withMessage('Valid phone required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, phone, password, referralCode } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email, phone);
    if (existing) return res.status(409).json({ success: false, message: 'Email or phone already registered' });

    const hashed = bcrypt.hashSync(password, 10);
    const myReferralCode = generateReferralCode(name);

    const insert = db.prepare(
      `INSERT INTO users (name, email, phone, password, referral_code, referred_by) VALUES (?,?,?,?,?,?)`
    );
    const result = insert.run(name, email, phone, hashed, myReferralCode, referralCode || null);
    const userId = result.lastInsertRowid;

    // Create wallet
    db.prepare('INSERT INTO wallets (user_id, balance) VALUES (?, 0)').run(userId);

    // Handle referral bonus (credited to referrer once new user verifies — simplified: credit immediately)
    if (referralCode) {
      const referrer = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(referralCode);
      if (referrer) {
        const bonus = Number(db.prepare("SELECT value FROM settings WHERE key='referral_bonus'").get()?.value || 500);
        db.prepare('UPDATE wallets SET balance = balance + ? WHERE user_id = ?').run(bonus, referrer.id);
        db.prepare(
          `INSERT INTO transactions (user_id, type, amount, reference, status, channel, description) VALUES (?,?,?,?,?,?,?)`
        ).run(referrer.id, 'referral', bonus, `REF_${Date.now()}`, 'success', 'wallet', `Referral bonus for inviting ${name}`);
      }
    }

    // Generate OTP (send to email)
    const code = generateOtp();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins
    db.prepare('INSERT INTO otps (user_id, code, purpose, expires_at) VALUES (?,?,?,?)').run(userId, code, 'signup', expiresAt);
    sendOtpEmail(email, code);

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify the OTP sent to your email/phone.',
      userId,
    });
  }
);

// ---------------- VERIFY OTP ----------------
router.post('/verify-otp', (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ success: false, message: 'userId and code are required' });

  const otp = db
    .prepare('SELECT * FROM otps WHERE user_id = ? AND code = ? AND purpose = ? AND used = 0 ORDER BY id DESC')
    .get(userId, code, 'signup');

  if (!otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
  if (otp.expires_at < Date.now()) return res.status(400).json({ success: false, message: 'OTP expired' });

  db.prepare('UPDATE otps SET used = 1 WHERE id = ?').run(otp.id);
  db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(userId);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  sendWelcomeEmail(user.email, user.name);

  const token = signToken(user);
  delete user.password;
  res.json({ success: true, message: 'Account verified successfully', token, user });
});

// ---------------- RESEND OTP ----------------
router.post('/resend-otp', (req, res) => {
  const { userId } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const code = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  db.prepare('INSERT INTO otps (user_id, code, purpose, expires_at) VALUES (?,?,?,?)').run(userId, code, 'signup', expiresAt);
  sendOtpEmail(user.email, code);
  res.json({ success: true, message: 'OTP resent' });
});

// ---------------- LOGIN ----------------
router.post('/login', (req, res) => {
  const { identifier, password } = req.body; // identifier = email or phone
  if (!identifier || !password) return res.status(400).json({ success: false, message: 'Email/phone and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(identifier, identifier);
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  if (user.is_banned) return res.status(403).json({ success: false, message: 'Account banned. Contact support.' });
  if (!user.password) return res.status(400).json({ success: false, message: 'Please log in with Google for this account' });

  const match = bcrypt.compareSync(password, user.password);
  if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  if (!user.is_verified) {
    return res.status(403).json({ success: false, message: 'Please verify your account first', requiresOtp: true, userId: user.id });
  }

  const token = signToken(user);
  delete user.password;
  res.json({ success: true, message: 'Login successful', token, user });
});

// ---------------- GOOGLE LOGIN (Continue with Google) ----------------
// The browser sends Google's signed ID token ("credential"). We verify it ourselves - we never trust
// an email sent by the browser - then log the person in, creating the account on first use.
router.post('/google', async (req, res) => {
  const { credential, referralCode } = req.body;
  if (!credential) return res.status(400).json({ success: false, message: 'Google sign-in data required' });
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ success: false, message: 'Google sign-in is not available right now.' });
  }

  let g;
  try {
    g = await verifyGoogleIdToken(credential);
  } catch (err) {
    console.error('Google sign-in rejected:', err.message);
    return res.status(401).json({ success: false, message: 'Google sign-in failed. Please try again.' });
  }

  const email = normalizeEmail(g.email);
  const name = g.name || 'Google User';
  let user = db.prepare('SELECT * FROM users WHERE email = ? OR email = ?').get(email, g.email.toLowerCase());

  if (!user) {
    const phonePlaceholder = `g_${g.sub}`.substring(0, 15); // they can add a real number in Profile
    const myReferralCode = generateReferralCode(name);
    const result = db
      .prepare(
        `INSERT INTO users (name, email, phone, password, is_verified, auth_provider, referral_code, referred_by) VALUES (?,?,?,?,?,?,?,?)`
      )
      .run(name, email, phonePlaceholder, null, 1, 'google', myReferralCode, referralCode || null);
    const userId = result.lastInsertRowid;
    db.prepare('INSERT INTO wallets (user_id, balance) VALUES (?, 0)').run(userId);

    // Referral bonus - same rule as normal signup
    if (referralCode) {
      const referrer = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(referralCode);
      if (referrer && referrer.id !== userId) {
        const bonus = Number(db.prepare("SELECT value FROM settings WHERE key='referral_bonus'").get()?.value || 500);
        db.prepare('UPDATE wallets SET balance = balance + ? WHERE user_id = ?').run(bonus, referrer.id);
        db.prepare(
          `INSERT INTO transactions (user_id, type, amount, reference, status, channel, description) VALUES (?,?,?,?,?,?,?)`
        ).run(referrer.id, 'referral', bonus, `REF_${Date.now()}`, 'success', 'wallet', `Referral bonus for inviting ${name}`);
      }
    }
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    sendWelcomeEmail(email, name);
  } else if (!user.is_verified) {
    // Someone may have registered this email by password without owning it. Google proves the real owner,
    // so this account becomes theirs and the old password is removed.
    db.prepare("UPDATE users SET is_verified = 1, password = NULL, auth_provider = 'google' WHERE id = ?").run(user.id);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

  if (user.is_banned) return res.status(403).json({ success: false, message: 'Account banned. Contact support.' });

  const token = signToken(user);
  delete user.password;
  res.json({ success: true, message: 'Logged in with Google', token, user });
});

// ---------------- FORGOT PASSWORD ----------------
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  // Always respond success (avoid leaking which emails exist)
  if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);

  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  sendPasswordResetEmail(email, resetLink);

  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
});

// ---------------- RESET PASSWORD ----------------
router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and new password required' });

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || user.reset_token_expires < Date.now()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hashed, user.id);

  res.json({ success: true, message: 'Password reset successful. Please log in.' });
});

// ---------------- GET CURRENT USER ----------------
router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ---------------- UPDATE PROFILE ----------------
router.patch('/profile', requireAuth, (req, res) => {
  const { name, phone, avatar } = req.body;
  db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), avatar = COALESCE(?, avatar) WHERE id = ?')
    .run(name, phone, avatar, req.user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  delete updated.password;
  res.json({ success: true, message: 'Profile updated', user: updated });
});

// ---------------- CHANGE PASSWORD ----------------
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both fields are required' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user.password || !bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
  res.json({ success: true, message: 'Password changed successfully' });
});

module.exports = router;
