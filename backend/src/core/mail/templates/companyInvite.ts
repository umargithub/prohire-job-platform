import { config } from "../../../config";

export function companyInviteTemplate(
  token: string,
  companyName: string,
): { subject: string; html: string } {
  const url = `${config.FRONTEND_URL}/company/invites/accept?token=${token}`;
  return {
    subject: `You've been invited to join ${companyName} on ProHire`,
    html: `
      <h2>Team Invitation</h2>
      <p>You've been invited to join <strong>${companyName}</strong> as a recruiter on ProHire.</p>
      <p><a href="${url}" style="padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Accept Invitation</a></p>
      <p>This invitation expires in 48 hours.</p>
      <p>You'll need a ProHire company account to accept. If you don't have one, register first at ${config.FRONTEND_URL}/auth/register/company.</p>
      <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
    `,
  };
}
