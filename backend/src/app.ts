import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";

import { logger } from "./core/utils/logger";
import { requestIdMiddleware } from "./core/middlewares/requestId.middleware";
import { createRateLimiter } from "./core/middlewares/rateLimiter.middleware";
import { globalErrorHandler } from "./core/errors/error-handler.middleware";
import { NotFoundError } from "./core/errors/AppError";

import healthRoutes from "./modules/health/health.routes";

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());

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
app.use(
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 500,
  }),
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/health", healthRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError("Route"));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
