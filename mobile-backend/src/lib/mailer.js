import nodemailer from 'nodemailer';
import config from '../config.js';

export const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export async function sendEmail({ to, subject, html, text }) {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    throw new Error('SMTP configuration is missing');
  }

  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    html,
    text,
  });
}
