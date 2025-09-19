// backend/services/emailService.js
// Minimal, production-ready email helper using Nodemailer + Gmail App Password

const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false") === "true"; // true for 465, false for 587
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = (process.env.SMTP_PASS || "").trim(); // Gmail app password (can include spaces)
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

if (!SMTP_USER || !SMTP_PASS) {
  console.warn(
    "[emailService] Missing SMTP_USER/SMTP_PASS. Email sending will fail until .env is set."
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

/**
 * Optional connectivity check (call once on boot if you like)
 */
async function verify() {
  try {
    await transporter.verify();
    console.log("✅ SMTP connection verified");
  } catch (err) {
    console.error("❌ SMTP verification failed:", err.message);
    throw err;
  }
}

/**
 * Send an email
 * @param {Object} opts
 * @param {string|string[]} opts.to - recipient(s)
 * @param {string} opts.subject
 * @param {string} [opts.text]
 * @param {string} [opts.html]
 * @param {Array}  [opts.attachments] - [{ filename, path|content, contentType }]
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 */
async function sendEmail({ to, subject, text, html, attachments = [] }) {
  if (!to) throw new Error("sendEmail: 'to' is required");
  if (!subject) throw new Error("sendEmail: 'subject' is required");

  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
    attachments,
  });

  // Helpful log in dev
  if (process.env.NODE_ENV !== "production") {
    console.log(`[emailService] Sent → ${Array.isArray(to) ? to.join(", ") : to} :: ${info.messageId}`);
  }

  return info;
}

module.exports = { sendEmail, verify };
