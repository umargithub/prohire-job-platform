import app from "./app";
import { config } from "./config";
import { logger } from "./core/utils/logger";
import { createEmailWorker } from "./core/queue/email.worker";
import { pool } from "./core/database/db";
import { redis } from "./core/redis/redis";

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, "Server started");
});

const emailWorker = createEmailWorker();
logger.info("Email worker started");

const shutdown = (signal: string): void => {
  logger.info({ signal }, "Shutting down gracefully");
  void emailWorker.close().then(() => {
    server.close(() => {
      logger.info("HTTP server closed");
      void Promise.allSettled([pool.end(), redis.quit()]).then(() => {
        logger.info("DB pool and Redis closed");
        process.exit(0);
      });
    });
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  process.exit(1);
});

export default server;
