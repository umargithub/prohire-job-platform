import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import { config } from "./config";
import { logger } from "./core/utils/logger";
import { requestIdMiddleware } from "./core/middlewares/requestId.middleware";
import { requestTimeout } from "./core/middlewares/requestTimeout.middleware";
import { createRateLimiter } from "./core/middlewares/rateLimiter.middleware";
import { globalErrorHandler } from "./core/errors/error-handler.middleware";
import { NotFoundError } from "./core/errors/AppError";
import { openApiSpec } from "./core/docs/openapi";
import { container } from "./core/container/container";
import { db } from "./core/database/db";
import { redis } from "./core/redis/redis";
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
import { ApplicationRepository } from "./modules/applications/application.repository";
import { ApplicationService } from "./modules/applications/application.service";
import { ApplicationController } from "./modules/applications/application.controller";
import { AdminRepository } from "./modules/admin/admin.repository";
import { AdminService } from "./modules/admin/admin.service";
import { AdminController } from "./modules/admin/admin.controller";
import { BookmarkRepository } from "./modules/bookmarks/bookmark.repository";
import { BookmarkService } from "./modules/bookmarks/bookmark.service";

import healthRoutes from "./modules/health/health.routes";
import authRoutes from "./modules/auth/auth.routes";
import companyRoutes from "./modules/company/company.routes";
import jobsRoutes from "./modules/jobs/jobs.routes";
import candidateRoutes from "./modules/candidate/candidate.routes";
import applicationRoutes from "./modules/applications/application.routes";
import adminRoutes from "./modules/admin/admin.routes";

const app = express();

// ── Proxy trust ───────────────────────────────────────────────────────────────
if (config.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// ── Request timeout (30 s) ────────────────────────────────────────────────────
app.use(requestTimeout(30_000));

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
      db,
      redis,
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
  () => new CompanyService(
    container.resolve<CompanyRepository>("companyRepository"),
    container.resolve<EmailQueue>("emailQueue"),
  ),
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
container.register("candidateRepository", () => new CandidateRepository(db));
container.register(
  "candidateService",
  () => new CandidateService(container.resolve<CandidateRepository>("candidateRepository")),
);
container.register("bookmarkRepository", () => new BookmarkRepository(db));
container.register(
  "bookmarkService",
  () => new BookmarkService(container.resolve<BookmarkRepository>("bookmarkRepository")),
);
container.register(
  "candidateController",
  () => new CandidateController(
    container.resolve<CandidateService>("candidateService"),
    container.resolve<BookmarkService>("bookmarkService"),
  ),
);
container.register("applicationRepository", () => new ApplicationRepository(db));
container.register(
  "applicationService",
  () =>
    new ApplicationService(
      container.resolve<ApplicationRepository>("applicationRepository"),
      container.resolve<JobsRepository>("jobsRepository"),
      container.resolve<CandidateRepository>("candidateRepository"),
      container.resolve<EmailQueue>("emailQueue"),
    ),
);
container.register(
  "applicationController",
  () =>
    new ApplicationController(
      container.resolve<ApplicationService>("applicationService"),
    ),
);
container.register(
  "jobsController",
  () => new JobsController(
    container.resolve<JobsService>("jobsService"),
    container.resolve<ApplicationService>("applicationService"),
  ),
);
container.register("adminRepository", () => new AdminRepository(db));
container.register(
  "adminService",
  () => new AdminService(container.resolve<AdminRepository>("adminRepository")),
);
container.register(
  "adminController",
  () => new AdminController(container.resolve<AdminService>("adminService")),
);

// ── API docs ──────────────────────────────────────────────────────────────────
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes(container.resolve<AuthController>("authController")));
app.use("/api/v1/company", companyRoutes(container.resolve<CompanyController>("companyController")));
app.use("/api/v1/jobs", jobsRoutes(container.resolve<JobsController>("jobsController")));
app.use("/api/v1/candidate", candidateRoutes(container.resolve<CandidateController>("candidateController")));
app.use("/api/v1/applications", applicationRoutes(container.resolve<ApplicationController>("applicationController")));
app.use("/api/v1/admin", adminRoutes(container.resolve<AdminController>("adminController")));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError("Route"));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(globalErrorHandler);

export default app;
