const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const wrap = (title, bodyHtml) => `
  <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #eee">
    <div style="background:#0A1628;padding:24px;text-align:center">
      <span style="color:#FFFFFF;font-weight:800;font-size:20px;letter-spacing:0.5px">Al-Zayn</span><span style="color:#1E6FFF;font-weight:800;font-size:20px"> Hub</span>
    </div>
    <div style="padding:28px;color:#111">
      <h2 style="margin-top:0;color:#1E6FFF">${title}</h2>
      ${bodyHtml}
      <p style="margin-top:32px;font-size:12px;color:#888">Al-Zayn Hub — VTU Services · Gadgets</p>
    </div>
  </div>
`;

async function sendMail({ to, subject, html }) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Al-Zayn Hub" <no-reply@alzaynhub.com>',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.warn('⚠ Email send failed (check SMTP env vars):', err.message);
  }
}

async function sendWelcomeEmail(to, name) {
  return sendMail({
    to,
    subject: 'Welcome to Al-Zayn Hub 🎉',
    html: wrap('Welcome aboard, ' + name + '!', `
      <p>Your account has been created successfully. You now have access to instant data, airtime, VPN plans, and our gadget shop.</p>
      <p>Fund your wallet anytime and enjoy fast, trustworthy service.</p>
    `),
  });
}

async function sendOtpEmail(to, code) {
  return sendMail({
    to,
    subject: 'Your Al-Zayn Hub Verification Code',
    html: wrap('Verify your account', `
      <p>Your One-Time Password (OTP) is:</p>
      <p style="font-size:32px;font-weight:800;letter-spacing:6px;color:#000;background:#f2f2f2;padding:14px;border-radius:8px;text-align:center">${code}</p>
      <p>This code expires in 10 minutes. Do not share it with anyone.</p>
    `),
  });
}

async function sendPasswordResetEmail(to, resetLink) {
  return sendMail({
    to,
    subject: 'Reset your Al-Zayn Hub password',
    html: wrap('Reset your password', `
      <p>We received a request to reset your password. Click the button below to proceed:</p>
      <p style="text-align:center"><a href="${resetLink}" style="display:inline-block;background:#1E6FFF;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>
    `),
  });
}

async function sendOrderConfirmationEmail(to, order) {
  return sendMail({
    to,
    subject: `Order Confirmed — #${order.id}`,
    html: wrap('Order Confirmed ✅', `
      <p>Thanks for your order! Here's a summary:</p>
      <p><strong>Order ID:</strong> #${order.id}<br/>
      <strong>Total:</strong> ₦${Number(order.total).toLocaleString()}<br/>
      <strong>Status:</strong> ${order.status}</p>
      <p>We'll notify you as your order status updates.</p>
    `),
  });
}

module.exports = { sendMail, sendWelcomeEmail, sendOtpEmail, sendPasswordResetEmail, sendOrderConfirmationEmail };
