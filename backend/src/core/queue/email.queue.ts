import { Queue } from "bullmq";
import { config } from "../../config";

export type EmailJobData =
  | { type: "verify-email"; to: string; token: string }
  | { type: "password-reset"; to: string; token: string }
  | { type: "stage-changed"; to: string; stage: string; jobTitle: string };

interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
}

function parseRedisUrl(url: string): RedisConnectionOptions {
  const parsed = new URL(url);
  const opts: RedisConnectionOptions = {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
  };
  if (parsed.password) opts.password = decodeURIComponent(parsed.password);
  return opts;
}

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
}
