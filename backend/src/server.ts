import app from "./app";
import { config } from "./config";
import { logger } from "./core/utils/logger";
import { createEmailWorker } from "./core/queue/email.worker";

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
      process.exit(0);
    });
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;
