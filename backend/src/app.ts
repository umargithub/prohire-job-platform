import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";

import { config } from "./config";
import { logger } from "./core/utils/logger";
import { requestIdMiddleware } from "./core/middlewares/requestId.middleware";
import { createRateLimiter } from "./core/middlewares/rateLimiter.middleware";
import { globalErrorHandler } from "./core/errors/error-handler.middleware";
import { NotFoundError } from "./core/errors/AppError";
import { container } from "./core/container/container";
import { db } from "./core/database/db";
import { EmailQueue } from "./core/queue/email.queue";
import { AuthRepository } from "./modules/auth/auth.repository";
import { AuthService } from "./modules/auth/auth.service";
import { AuthController } from "./modules/auth/auth.controller";

import healthRoutes from "./modules/health/health.routes";
import authRoutes from "./modules/auth/auth.routes";

const app = express();

// ── Proxy trust ───────────────────────────────────────────────────────────────
if (config.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── Request ID ────────────────────────────────────────────────────────────────
app.use(requestIdMiddleware);

// ── HTTP request logger ───────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => (req as Request).id,
  }),
);

// ── Global rate limiter (500 req/min) ─────────────────────────────────────────
app.use(createRateLimiter("global", 500, 60_000, "global"));

// ── Dependency injection ──────────────────────────────────────────────────────
container.register("emailQueue", () => new EmailQueue());
container.register("authRepository", () => new AuthRepository(db));
container.register(
  "authService",
  () =>
    new AuthService(
      container.resolve<AuthRepository>("authRepository"),
      container.resolve<EmailQueue>("emailQueue"),
    ),
);
container.register(
  "authController",
  () => new AuthController(container.resolve<AuthService>("authService")),
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError("Route"));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
