import nodemailer from "nodemailer";
import { config } from "../../config";
import { logger } from "../utils/logger";

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = config.SMTP_HOST
  ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    })
  : null;

export async function sendMail(opts: MailOptions): Promise<void> {
  if (!transporter) {
    logger.info(
      { to: opts.to, subject: opts.subject },
      "[DEV] SMTP not configured — email skipped",
    );
    return;
  }

  await transporter.sendMail({
    from: config.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}
