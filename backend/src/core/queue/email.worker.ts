import { Worker, Job } from "bullmq";
import { config } from "../../config";
import { logger } from "../utils/logger";
import { sendMail } from "../mail/mailer";
import { parseRedisUrl } from "./parseRedisUrl";
import { verifyEmailTemplate } from "../mail/templates/verifyEmail";
import { passwordResetTemplate } from "../mail/templates/passwordReset";
import { companyInviteTemplate } from "../mail/templates/companyInvite";
import { stageChangedTemplate } from "../mail/templates/stageChanged";
import type { EmailJobData } from "./email.queue";

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { data } = job;

  switch (data.type) {
    case "verify-email": {
      const { subject, html } = verifyEmailTemplate(data.token);
      await sendMail({ to: data.to, subject, html });
      break;
    }
    case "password-reset": {
      const { subject, html } = passwordResetTemplate(data.token);
      await sendMail({ to: data.to, subject, html });
      break;
    }
    case "company-invite": {
      const { subject, html } = companyInviteTemplate(
        data.token,
        data.companyName,
      );
      await sendMail({ to: data.to, subject, html });
      break;
    }
    case "stage-changed": {
      const { subject, html } = stageChangedTemplate(data.stage, data.jobTitle);
      await sendMail({ to: data.to, subject, html });
      break;
    }
    default: {
      logger.warn(
        { type: (data as { type: string }).type },
        "Unhandled email job type",
      );
    }
  }
}

export function createEmailWorker(): Worker<EmailJobData> {
  const connection = parseRedisUrl(config.REDIS_URL);

  const worker = new Worker<EmailJobData>("email", processEmailJob, {
    connection,
    concurrency: 5,
  }) as Worker<EmailJobData>;

  worker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, type: job.data.type, to: job.data.to },
      "Email job completed",
    );
  });

  worker.on("failed", (job, err) => {
    // Fires on every attempt failure and when all attempts are exhausted (dead-letter)
    logger.error(
      {
        jobId: job?.id,
        type: job?.data.type,
        to: job?.data.to,
        attemptsMade: job?.attemptsMade,
        data: job?.data,
        err,
      },
      "Email job failed",
    );
  });

  worker.on("stalled", (jobId) => {
    logger.warn({ jobId }, "Email job stalled");
  });

  worker.on("error", (err) => {
    logger.error({ err }, "Email worker error");
  });

  return worker;
}
