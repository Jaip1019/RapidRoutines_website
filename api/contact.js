"use strict";

const nodemailer = require("nodemailer");

const DEFAULT_TO_EMAIL = "support@rapidroutines.org";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function normalize(body) {
  return {
    name: String(body?.name || "").trim(),
    email: String(body?.email || "").trim(),
    message: String(body?.message || "").trim(),
  };
}

function validate(data) {
  if (!data.name || !data.email || !data.message) {
    return "Name, email, and message are required.";
  }

  if (!EMAIL_RE.test(data.email)) {
    return "Please enter a valid email address.";
  }

  return null;
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createTransporter() {
  const host = process.env.ZOHO_SMTP_HOST || "smtp.zoho.com";
  const port = Number(process.env.ZOHO_SMTP_PORT || 465);
  const secure = process.env.ZOHO_SMTP_SECURE
    ? process.env.ZOHO_SMTP_SECURE === "true"
    : port === 465;
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS;

  if (!user || !pass) {
    throw new Error("Missing Zoho SMTP credentials (ZOHO_SMTP_USER/ZOHO_SMTP_PASS).");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { message: "Method not allowed" });
  }

  try {
    const data = normalize(req.body);
    const validationError = validate(data);

    if (validationError) {
      return json(res, 400, { message: validationError });
    }

    const transporter = createTransporter();
    const to = process.env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL || process.env.ZOHO_SMTP_USER;
    const safeName = escapeHtml(data.name);
    const safeEmail = escapeHtml(data.email);
    const safeMessage = escapeHtml(data.message);

    await transporter.sendMail({
      from,
      to,
      replyTo: data.email,
      subject: `New Contact Form Message from ${data.name}`,
      text: `Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`,
      html: `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Message:</strong></p><p>${safeMessage.replaceAll("\n", "<br>")}</p>`,
    });

    return json(res, 200, { message: "Message sent successfully." });
  } catch (error) {
    console.error("Contact form send error:", error);
    return json(res, 500, { message: "Unable to send message right now." });
  }
};
