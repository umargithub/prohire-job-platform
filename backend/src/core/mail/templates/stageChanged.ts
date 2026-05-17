import { config } from "../../../config";

const STAGE_LABELS: Record<string, string> = {
  reviewed: "Your application has been reviewed",
  interview: "You've been selected for an interview",
  offered: "Congratulations — you've received an offer",
  rejected: "Application update",
};

const STAGE_MESSAGES: Record<string, string> = {
  reviewed: "Your application has been reviewed by the hiring team. We'll be in touch with next steps.",
  interview: "Great news! The hiring team would like to schedule an interview with you. They will reach out to you shortly with details.",
  offered: "Congratulations! After careful consideration, the company has decided to extend you an offer. They will be in touch with the details.",
  rejected: "Thank you for your interest. After careful consideration, the company has decided to move forward with other candidates. We encourage you to keep applying.",
};

export function stageChangedTemplate(
  stage: string,
  jobTitle: string,
): { subject: string; html: string } {
  const label = STAGE_LABELS[stage] ?? "Your application status has been updated";
  const message = STAGE_MESSAGES[stage] ?? `Your application status has been updated to: ${stage}.`;

  return {
    subject: `${label} — ${jobTitle}`,
    html: `
      <h2>${label}</h2>
      <p>Regarding your application for <strong>${jobTitle}</strong>:</p>
      <p>${message}</p>
      <p><a href="${config.FRONTEND_URL}/candidate/applications" style="padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">View My Applications</a></p>
    `,
  };
}
