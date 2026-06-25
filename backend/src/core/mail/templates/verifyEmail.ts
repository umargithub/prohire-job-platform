import { config } from "../../../config";

export function verifyEmailTemplate(token: string): { subject: string; html: string } {
  const url = `${config.FRONTEND_URL}/verify-email?token=${token}`;
  return {
    subject: "Verify your ProHire email",
    html: `
      <h2>Welcome to ProHire</h2>
      <p>Thanks for signing up. Please verify your email address to activate your account.</p>
      <p><a href="${url}" style="padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `,
  };
}
