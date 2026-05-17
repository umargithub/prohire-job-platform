import { Queue } from "bullmq";
import { config } from "../../config";
import { parseRedisUrl } from "./parseRedisUrl";

export type EmailJobData =
  | { type: "verify-email"; to: string; token: string }
  | { type: "password-reset"; to: string; token: string }
  | { type: "stage-changed"; to: string; stage: string; jobTitle: string }
  | { type: "company-invite"; to: string; token: string; companyName: string };

export class EmailQueue {
  // Queue type inferred — avoids BullMQ's bundled ioredis version conflict
  private readonly queue: Queue<EmailJobData>;

  constructor() {
    const connection = parseRedisUrl(config.REDIS_URL);

    this.queue = new Queue<EmailJobData>("email", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    }) as Queue<EmailJobData>;
  }

  async enqueueVerificationEmail(to: string, token: string): Promise<void> {
    await this.queue.add(
      "verify-email",
      { type: "verify-email", to, token },
      { jobId: `verify-email:${to}` },
    );
  }

  async enqueueStageChangedEmail(
    to: string,
    stage: string,
    jobTitle: string,
  ): Promise<void> {
    await this.queue.add(
      "stage-changed",
      { type: "stage-changed", to, stage, jobTitle },
      { jobId: `stage-changed:${to}:${Date.now()}` },
    );
  }

  async enqueuePasswordResetEmail(to: string, token: string): Promise<void> {
    await this.queue.add(
      "password-reset",
      { type: "password-reset", to, token },
      { jobId: `password-reset:${to}` },
    );
  }

  async enqueueCompanyInviteEmail(
    to: string,
    token: string,
    companyName: string,
  ): Promise<void> {
    await this.queue.add(
      "company-invite",
      { type: "company-invite", to, token, companyName },
      { jobId: `company-invite:${to}` },
    );
  }
}
