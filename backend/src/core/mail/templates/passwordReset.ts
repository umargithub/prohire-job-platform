import { config } from "../../../config";

export function passwordResetTemplate(token: string): { subject: string; html: string } {
  const url = `${config.FRONTEND_URL}/reset-password?token=${token}`;
  return {
    subject: "Reset your ProHire password",
    html: `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the link below to set a new one.</p>
      <p><a href="${url}" style="padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
    `,
  };
}
