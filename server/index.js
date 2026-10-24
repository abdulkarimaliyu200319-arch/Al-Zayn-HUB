require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('./db'); // initializes + seeds the database on boot

const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const vtuRoutes = require('./routes/vtu.routes');
const vpnRoutes = require('./routes/vpn.routes');
const shopRoutes = require('./routes/shop.routes');
const adminRoutes = require('./routes/admin.routes');
const publicRoutes = require('./routes/public.routes');
const webhookRoutes = require('./routes/webhook.routes');

const app = express();

// If the website has been built (client/dist), this server serves it too = ONE service for everything.
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
const SERVE_CLIENT = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

// Behind Render/Railway/Vercel proxies: lets rate-limiting see each visitor's real IP (not the proxy's)
app.set('trust proxy', 1);

// Google's sign-in popup needs 'same-origin-allow-popups' (helmet's default would block it).
// CSP is relaxed only when this server also serves the website (it uses Google Fonts + Google sign-in).
app.use(helmet({
  contentSecurityPolicy: SERVE_CLIENT ? false : undefined,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(morgan('dev'));

// Global rate limiter (protects all API routes)
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', globalLimiter);

// Stricter limiter for auth endpoints (brute force protection)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many attempts, please try again later.' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/admin/login', authLimiter);

// IMPORTANT: Monnify webhook needs the RAW body for signature verification,
// so it's mounted BEFORE express.json().
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

// Standard JSON body parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// ---------- ROUTES ----------
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/data', vtuRoutes); // /api/data/buy-data, /api/data/buy-airtime, etc.
app.use('/api/vpn', vpnRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'Al-Zayn Hub API is live 🚀' }));

// 404 handler
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// Serve the built website (only when client/dist exists) + SPA fallback so page refreshes work
if (SERVE_CLIENT) {
  app.use(express.static(CLIENT_DIST, { maxAge: '1h', index: false }));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on our end.' });
});

// Production safety warnings
if (process.env.NODE_ENV === 'production') {
  const jwt = process.env.JWT_SECRET || '';
  if (jwt.length < 32 || /replace_this/i.test(jwt)) console.warn('⚠️  JWT_SECRET is weak/placeholder - set a long random value NOW.');
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin123') console.warn('⚠️  Admin password is the default (admin123) - change it before launch!');
  if ((process.env.MONNIFY_ENV || 'sandbox').toLowerCase() !== 'live') console.warn('⚠️  MONNIFY_ENV is not "live" - customers cannot make real payments yet.');
  if (!process.env.MONNIFY_API_KEY || !process.env.MONNIFY_SECRET_KEY || !process.env.MONNIFY_CONTRACT_CODE) console.warn('⚠️  Monnify keys are missing - wallet funding will not work.');
  if ((process.env.VTPASS_ENV || 'sandbox').toLowerCase() !== 'live') console.warn('⚠️  VTPASS_ENV is not "live" - customers are NOT receiving real airtime/data.');
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n⚡ Al-Zayn Hub API running on http://localhost:${PORT}`);
  console.log(SERVE_CLIENT ? '   Website: served from client/dist (single-service mode)' : '   Website: not built here (API-only mode)');
  console.log(`   Admin login: ${process.env.ADMIN_USERNAME || 'admin'} / ${process.env.ADMIN_PASSWORD || 'admin123'}\n`);
});
