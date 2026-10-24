# Al-Zayn Hub — alzaynhub.com

**Al-Zayn Hub. Data. Gadgets. Delivered.**

A full-stack, mobile-first platform for buying data/airtime/cable/electricity, subscribing to VPN plans, and shopping for gadgets — all powered by a user wallet funded via Paystack.

Stack: **React + Vite + TailwindCSS** (frontend) · **Node.js + Express + SQLite (better-sqlite3)** (backend) · **JWT + bcrypt** auth · **Paystack** payments.

---

## 1. Folder Structure

```
alzayn-hub/
├── server/                     # Node/Express API
│   ├── index.js                 # App entry point
│   ├── db.js                    # SQLite schema + seed data
│   ├── middleware/
│   │   └── auth.js              # requireAuth / requireAdmin (JWT)
│   ├── routes/
│   │   ├── auth.routes.js       # signup, login, OTP, password reset, profile
│   │   ├── wallet.routes.js     # balance, fund via Paystack, tx history
│   │   ├── webhook.routes.js    # Paystack webhook (auto wallet credit)
│   │   ├── vtu.routes.js        # data, airtime, cable, electricity
│   │   ├── vpn.routes.js        # VPN plans, subscribe/renew
│   │   ├── shop.routes.js       # products, checkout, orders
│   │   ├── admin.routes.js      # full admin CRUD
│   │   └── public.routes.js     # public site settings (whatsapp no. etc.)
│   ├── utils/
│   │   ├── email.js             # Nodemailer + HTML templates
│   │   ├── paystack.js          # Paystack API wrapper
│   │   └── otp.js               # OTP + reference generators
│   ├── data/                    # SQLite .db file lives here (auto-created)
│   ├── package.json
│   └── .env.example
│
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── api/axios.js         # Axios instance w/ auto JWT header
│   │   ├── context/AuthContext.jsx
│   │   ├── components/          # Navbar, Footer, WhatsAppButton, route guards
│   │   ├── pages/                # Home, Signup, Login, VTU, VPN, Shop, About, Contact, FAQ...
│   │   ├── pages/dashboard/      # User dashboard (Wallet, BuyData, MyVPN, Orders, etc.)
│   │   ├── pages/admin/          # Admin panel (Users, Products, VTU, Orders, Settings)
│   │   ├── App.jsx               # All routes
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
└── .gitignore
```

---

## 2. How to Run Locally

### Prerequisites
- Node.js v18+ and npm installed
- A free [Paystack](https://paystack.com) test account (for Paystack test keys)
- (Optional but recommended) An SMTP account for real emails — e.g. a Gmail address with an [App Password](https://support.google.com/accounts/answer/185833), or a free [Mailtrap](https://mailtrap.io) sandbox inbox for testing

### Step 1 — Backend setup
```bash
cd server
npm install
cp .env.example .env
```
Open `.env` and fill in your values (see **Section 3** below for what each key means). At minimum, set `JWT_SECRET` to any long random string.

Start the server:
```bash
npm run dev        # uses nodemon, auto-restarts on file changes
# or
npm start           # plain node
```
On first run, `db.js` automatically creates `server/data/alzayn.db`, builds every table, and seeds:
- 1 admin account (`admin` / `admin123`, or whatever you set in `.env`)
- 8 shop products
- 12 VTU data prices across MTN/GLO/AIRTEL/9MOBILE
- 3 VPN plans (Basic, Pro, Premium)

You should see:
```
⚡ Al-Zayn Hub API running on http://localhost:5000
   Admin login: admin / admin123
```

### Step 2 — Frontend setup
Open a **second terminal**:
```bash
cd client
npm install
cp .env.example .env
```
The default `.env` already points `VITE_API_URL` to `http://localhost:5000/api`, which matches the backend above — no changes needed for local dev.

Start the frontend:
```bash
npm run dev
```
Visit **http://localhost:5173**.

### Step 3 — Try it out
1. Go to `/signup`, create an account. The OTP is emailed to the address you used (check your SMTP inbox, or the server terminal log if email isn't configured yet — `sendOtpEmail` will log a warning but the OTP is also visible directly in the `otps` table if you inspect the DB).
2. Verify the OTP → you're logged in and redirected to `/dashboard`.
3. Go to **Dashboard → Wallet → Fund Wallet**, enter an amount, and complete payment on the Paystack test checkout page (use Paystack's [test card numbers](https://paystack.com/docs/payments/test-payments/)).
4. Once funded, try **Buy Data/Airtime**, **VPN**, or **Shop checkout** — all deduct from your wallet instantly.
5. Visit `/admin/login` and log in with `admin` / `admin123` to manage users, products, VTU prices, orders, and site settings.

---

## 3. Environment Variables (`server/.env`)

| Key | Description |
|---|---|
| `PORT` | Port the API runs on (default `5000`) |
| `CLIENT_URL` | Frontend URL, used for CORS + Paystack callback + reset links (`http://localhost:5173` locally) |
| `JWT_SECRET` | Long random string used to sign JWTs — **change this before going live** |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `DB_PATH` | Path to the SQLite file (default `./data/alzayn.db`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Seeded admin login (change and restart with a fresh DB to update) |
| `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` | From your [Paystack dashboard](https://dashboard.paystack.com/#/settings/developer) → use **test** keys (`pk_test_...` / `sk_test_...`) while developing |
| `PAYSTACK_WEBHOOK_SECRET` | Same as your secret key unless Paystack gives you a separate webhook secret |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Your email provider's SMTP credentials (Gmail App Password, Zoho, Mailtrap, etc.) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For "Continue with Google" — get these from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `WHATSAPP_NUMBER` | Number (with country code, no `+`) used by the sticky WhatsApp button |
| `REFERRAL_BONUS` | Naira amount credited per successful referral (default `500`) |

`client/.env`:

| Key | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |
| `VITE_GOOGLE_CLIENT_ID` | Same Google client ID as above, used client-side |

---

## 4. Connecting Real Payments (Paystack)

1. Create a free account at [paystack.com](https://paystack.com).
2. Go to **Settings → API Keys & Webhooks**, copy your **Test Secret Key** and **Test Public Key** into `server/.env`.
3. Under the same page, set your **Webhook URL** to:
   `https://your-deployed-backend-url.com/api/webhook/paystack`
   (For local testing, use a tunneling tool like [ngrok](https://ngrok.com): `ngrok http 5000`, then use the generated URL.)
4. Wallet funding, VPN purchases, and shop checkouts done via Paystack will now be automatically confirmed via the webhook (`server/routes/webhook.routes.js`), which credits the wallet or marks the order complete the moment payment succeeds — no manual polling needed. The frontend also does a fallback `verify` call after redirect, in case the webhook is delayed.
5. When ready for production, swap in your **Live** keys and re-point the webhook URL to your production backend.

---

## 5. Connecting Real Email (OTP, Welcome, Reset, Order Confirmation)

The app sends 4 email types automatically via `server/utils/email.js`:
- Welcome email (after OTP verification)
- OTP verification code (on signup)
- Password reset link
- Order confirmation

To enable real delivery:
1. **Gmail:** Enable 2FA on your Google account, then generate an [App Password](https://myaccount.google.com/apppasswords). Use that as `SMTP_PASS` with `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`.
2. **Or use Mailtrap** (recommended for testing): create a free sandbox inbox at mailtrap.io and copy its SMTP credentials into `.env` — every email will land safely in your Mailtrap inbox instead of a real recipient.
3. Restart the server after changing `.env`.

If SMTP isn't configured, the app **will not crash** — it logs a warning and continues, so you can still test the OTP flow by checking the `otps` table directly if needed.

---

## 6. Connecting "Continue with Google"

The backend already exposes `POST /api/auth/google` (expects `{ email, name, googleId }`). To fully wire up the button:
1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (Web application type). Add `http://localhost:5173` to Authorized JavaScript origins.
2. Copy the Client ID into `client/.env` as `VITE_GOOGLE_CLIENT_ID`.
3. Add the [Google Identity Services script](https://developers.google.com/identity/gsi/web/guides/overview) to `client/index.html` and use `google.accounts.id.initialize(...)` in `Login.jsx` / `Signup.jsx` to get a decoded profile, then call `api.post('/auth/google', { email, name, googleId: sub })`.

This wiring is intentionally left as a small final step since it requires **your own** Google Cloud project credentials — the backend endpoint is fully ready to receive it.

---

## 7. Admin Panel

- URL: `/admin/login`
- Default credentials: **admin / admin123** (change `ADMIN_USERNAME`/`ADMIN_PASSWORD` in `server/.env` before your **first** run — the seed only runs once against an empty database)
- Capabilities: view/ban users, manually fund any user's wallet, add/edit/delete shop products, add/edit/delete VTU data prices per network, update order statuses (Pending → Processing → Delivered), view all transactions platform-wide, and edit site settings (site name, WhatsApp number, Paystack keys, referral bonus).

To reset the admin password later, delete `server/data/alzayn.db` (⚠️ this wipes **all** data) and restart the server to reseed, or manually update the `admins` table's `password` column with a fresh bcrypt hash.

---

## 8. Deployment

### Backend (Render / Railway / Fly.io / a VPS)
1. Push the `server/` folder to its own repo (or deploy the monorepo, setting the root directory to `server`).
2. Set the build command to `npm install` and start command to `npm start`.
3. Add all the environment variables from `server/.env.example` in your hosting provider's dashboard.
4. **Important — SQLite persistence:** `better-sqlite3` writes to a local file. On platforms with ephemeral filesystems (like some free tiers), attach a **persistent volume/disk** mounted at the `data/` folder, or migrate to a hosted Postgres/MySQL for production scale (the query patterns in `db.js`/routes are simple enough to port).
5. Update `CLIENT_URL` to your deployed frontend URL, and update the Paystack webhook URL to `https://your-backend-domain/api/webhook/paystack`.

### Frontend (Vercel / Netlify)
1. Push `client/` (or point the platform's root directory to `client`).
2. Build command: `npm run build`. Output directory: `dist`.
3. Set the environment variable `VITE_API_URL` to your deployed backend's `/api` URL (e.g. `https://api.alzaynhub.com/api`).
4. Point your domain `alzaynhub.com` at the frontend deployment, and (optionally) `api.alzaynhub.com` at the backend.

### Domain & SSL
Once both are deployed, add your `alzaynhub.com` domain in your hosting provider's dashboard (most platforms above provision free SSL automatically via Let's Encrypt).

---

## 9. Security Notes Already Built In
- Passwords hashed with **bcrypt** (10 salt rounds)
- **JWT** auth for both users and admin (separate secrets/scopes)
- **express-rate-limit** on all `/api` routes, with a stricter limit on login endpoints (brute-force protection)
- **helmet** for secure HTTP headers
- **express-validator** on signup input
- Paystack **webhook signature verification** (HMAC SHA512) before trusting any payment event
- Banned users are blocked at the auth middleware level on every request

Before going fully live, also consider: HTTPS-only cookies if you switch off `localStorage` for tokens, a Web Application Firewall, regular DB backups, and moving file uploads (avatars) to S3/Cloudinary instead of base64/local disk.

---

## 10. What You Can Do Without Touching Code
Once running, an admin (or the seeded `admin` account) can, **entirely from the Admin Panel UI**:
- Add/edit/delete shop products
- Add/edit/delete VTU data prices per network
- Change the site name, WhatsApp number, Paystack keys, referral bonus
- Manually credit any user's wallet
- Ban/unban users
- Update order statuses

And every regular user can, **entirely from their own Dashboard**, without any admin involvement:
- Sign up, verify via OTP, log in, reset a forgotten password
- Fund their wallet via Paystack
- Buy data, airtime, pay cable/electricity bills
- Subscribe to / renew a VPN plan
- Shop for gadgets and track order status
- View full transaction history
- Update their profile, avatar, and password
- Share their referral link and earn ₦500 per signup

---

## 11. Support

This build is intentionally structured so each feature is a small, isolated route/page — if something needs tweaking (a new payment provider, more product fields, additional admin permissions), you can extend one file at a time without touching the rest of the app.
