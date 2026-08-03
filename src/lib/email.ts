import "server-only";
import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends via SMTP if configured (SMTP_HOST env var set). Returns false - rather
 * than throwing - when it isn't, so callers can fall back to showing the
 * recipient a copyable link instead of claiming an email went out that didn't.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const client = getTransporter();
  if (!client) return false;

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || "MedBill RCM Suite <no-reply@example.com>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return true;
  } catch (err) {
    console.error("[email] failed to send", err);
    return false;
  }
}
