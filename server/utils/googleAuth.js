// utils/googleAuth.js - verifies a "Sign in with Google" ID token on the server (no extra packages needed).
// The browser sends Google's signed token; we check Google's signature, our Client ID, expiry and verified email.
const crypto = require('crypto');
const fetch = require('node-fetch');

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let certCache = { keys: null, fetchedAt: 0 };

async function getKeys(force) {
  const fresh = certCache.keys && Date.now() - certCache.fetchedAt < 60 * 60 * 1000;
  if (fresh && !force) return certCache.keys;
  const res = await fetch(CERTS_URL, { timeout: 15000 });
  const json = await res.json();
  if (!json || !Array.isArray(json.keys)) throw new Error('Could not load Google signing keys');
  certCache = { keys: json.keys, fetchedAt: Date.now() };
  return certCache.keys;
}

const b64json = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

// Returns { sub, email, name, picture } or throws an Error if anything is wrong.
async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const header = b64json(parts[0]);
  const payload = b64json(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unexpected token algorithm');

  let jwk = (await getKeys(false)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await getKeys(true)).find((k) => k.kid === header.kid); // Google rotated keys
  if (!jwk) throw new Error('Unknown signing key');

  const valid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    crypto.createPublicKey({ key: jwk, format: 'jwk' }),
    Buffer.from(parts[2], 'base64url')
  );
  if (!valid) throw new Error('Bad signature');

  const now = Math.floor(Date.now() / 1000);
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) throw new Error('Wrong issuer');
  if (payload.aud !== clientId) throw new Error('Token was issued for a different app');
  if (!payload.exp || payload.exp < now - 60) throw new Error('Token expired');
  if (!payload.sub || !payload.email) throw new Error('Missing profile data');
  if (payload.email_verified !== true && payload.email_verified !== 'true') throw new Error('Google email not verified');

  return { sub: String(payload.sub), email: String(payload.email), name: payload.name || '', picture: payload.picture || null };
}

module.exports = { verifyGoogleIdToken };
