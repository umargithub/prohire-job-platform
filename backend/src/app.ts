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
import { CompanyRepository } from "./modules/company/company.repository";
import { CompanyService } from "./modules/company/company.service";
import { CompanyController } from "./modules/company/company.controller";
import { JobsRepository } from "./modules/jobs/jobs.repository";
import { JobsService } from "./modules/jobs/jobs.service";
import { JobsController } from "./modules/jobs/jobs.controller";
import { CandidateRepository } from "./modules/candidate/candidate.repository";
import { CandidateService } from "./modules/candidate/candidate.service";
import { CandidateController } from "./modules/candidate/candidate.controller";

import healthRoutes from "./modules/health/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import companyRoutes from "./modules/company/company.routes";
import jobsRoutes from "./modules/jobs/jobs.routes";
import candidateRoutes from "./modules/candidate/candidate.routes";

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
container.register(
  "companyRepository",
  () => new CompanyRepository(db),
);
container.register(
  "companyService",
  () => new CompanyService(container.resolve<CompanyRepository>("companyRepository")),
);
container.register(
  "companyController",
  () => new CompanyController(container.resolve<CompanyService>("companyService")),
);
container.register("jobsRepository", () => new JobsRepository(db));
container.register(
  "jobsService",
  () => new JobsService(container.resolve<JobsRepository>("jobsRepository")),
);
container.register(
  "jobsController",
  () => new JobsController(container.resolve<JobsService>("jobsService")),
);
container.register("candidateRepository", () => new CandidateRepository(db));
container.register(
  "candidateService",
  () => new CandidateService(container.resolve<CandidateRepository>("candidateRepository")),
);
container.register(
  "candidateController",
  () => new CandidateController(container.resolve<CandidateService>("candidateService")),
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes(container.resolve<AuthController>("authController")));
app.use("/api/v1/company", companyRoutes(container.resolve<CompanyController>("companyController")));
app.use("/api/v1/jobs", jobsRoutes(container.resolve<JobsController>("jobsController")));
app.use("/api/v1/candidate", candidateRoutes(container.resolve<CandidateController>("candidateController")));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError("Route"));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
