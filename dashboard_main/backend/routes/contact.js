const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();
const DEFAULT_TO_EMAIL = 'support@rapidroutines.org';

function normalizeInput(body) {
  return {
    name: String(body?.name || '').trim(),
    email: String(body?.email || '').trim(),
    message: String(body?.message || '').trim(),
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createZohoTransporter() {
  const host = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com';
  const port = Number(process.env.ZOHO_SMTP_PORT || 465);
  const secure = process.env.ZOHO_SMTP_SECURE
    ? process.env.ZOHO_SMTP_SECURE === 'true'
    : port === 465;
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS;

  if (!user || !pass) {
    throw new Error('Missing Zoho SMTP credentials (ZOHO_SMTP_USER/ZOHO_SMTP_PASS).');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

router.post('/', async (req, res) => {
  try {
    const data = normalizeInput(req.body);
    if (!data.name || !data.email || !data.message) {
      return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    if (!isValidEmail(data.email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const to = process.env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL || process.env.ZOHO_SMTP_USER;
    const transporter = createZohoTransporter();

    await transporter.sendMail({
      from,
      to,
      replyTo: data.email,
      subject: `New Contact Form Message from ${data.name}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`,
    });

    return res.status(200).json({ message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Contact form send error:', error);
    return res.status(500).json({ message: 'Unable to send message right now.' });
  }
});

module.exports = router;
