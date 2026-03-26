# CLAUDE.md — ProHire Development Guide

> This file is the source of truth for AI-assisted development on ProHire.
> Read this in full before writing any code.

---

## Project Identity

**Name:** ProHire  
**Type:** Production-grade job board SaaS (portfolio / hiring showcase)  
**Backend:** Node.js + Express + TypeScript + PostgreSQL + Redis + BullMQ  
**Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + TanStack Query + Zustand  
**Goal:** Impress senior engineers with architecture decisions, not just functionality.

---

## External Documentation

When implementing any library-specific code, use the **DocsExplorer** agent to fetch live docs before writing the implementation. Do not rely on training knowledge for library APIs.

Invoke DocsExplorer for:

- **PostgreSQL (node-postgres / pg)** — query API, transactions, parameterised statements
- **BullMQ** — Queue, Worker, Job options, retry strategies, dead-letter events
- **TanStack Query** — useMutation, useQuery, optimistic updates, query invalidation
- **Zod** — schema definitions, error formatting, refinements
- **Pino** — logger setup, transport config, child loggers

For any other library where the API may have changed or the implementation is non-trivial, invoke DocsExplorer before writing code.

DocsExplorer uses Context7 as primary source and falls back to web search automatically — always prefer it over guessing from training data.

## Phase Sequence

Follow the roadmap in strict order. Never scaffold the next phase until the current deliverable is confirmed working.

```
Phase 1  → Project skeleton + Docker
Phase 2  → Database schema + migrations
Phase 3  → Authentication system
Phase 4  → Company job management (CRUD + cache)
Phase 5  → Candidate job browsing (filters + rate limit)
Phase 6  → Application system (transactional)
Phase 7  → Optimistic locking for stage transitions
Phase 8  → Background jobs (BullMQ)
Phase 9  → Admin module
Phase 10 → Production hardening
Frontend → After backend is complete and tested
Deploy   → After frontend is complete
```

---

## Code Rules — Non-Negotiable

### TypeScript

- **Zero `any` types.** If you cannot infer the type, define an explicit interface or type alias.
- Use `strict: true` in `tsconfig.json`.
- All function return types must be explicitly annotated.
- Use `unknown` over `any` when the shape is genuinely unknown; narrow it before use.

### Architecture

- **Controllers are thin.** A controller method does exactly three things: call `asyncHandler`, extract validated DTO from `req`, call service, return response.
- **Services own all business logic.** No SQL in services — delegate to repositories.
- **Repositories own all SQL.** No business decisions in repositories.
- **No cross-module imports between repositories.** Services may call other services; repositories may not call other repositories.

### Naming Conventions

| Layer       | Pattern                     | Example                     |
| ----------- | --------------------------- | --------------------------- |
| Route file  | `*.routes.ts`               | `auth.routes.ts`            |
| Controller  | `*.controller.ts`           | `auth.controller.ts`        |
| Service     | `*.service.ts`              | `auth.service.ts`           |
| Repository  | `*.repository.ts`           | `auth.repository.ts`        |
| DTO         | `*.dto.ts`                  | `auth.dto.ts`               |
| Types       | `*.types.ts`                | `auth.types.ts`             |
| Error class | PascalCase extends AppError | `DuplicateApplicationError` |

### Error Handling

- Every async route handler must be wrapped in the `asyncHandler` utility. Never use raw try/catch in controllers.
- Throw typed `AppError` subclasses from the service layer. The global error handler catches them.
- Never expose stack traces in production responses.

### Validation

- All incoming request bodies validated with **Zod** before the controller logic runs.
- Use a `validate(schema)` middleware factory applied at the route level, not inside controllers.
- Return `422 VALIDATION_ERROR` with an array of field-level errors on failure.

### SQL & Database

- All queries use parameterised statements. No string interpolation in SQL.
- Use database transactions for: job application creation, any multi-step write.
- All migrations are numbered sequentially: `001_create_users.sql`, `002_create_companies.sql`, etc.
- Never drop a column in a migration; add a new column and migrate data.

### Caching

- All Redis cache keys must be prefixed with `prohire:`.
- Cache write-through: invalidate on every mutation, never stale-read.
- TTL must be defined as a named constant in `src/core/redis/ttl.constants.ts`.

### Queue Jobs

- Every BullMQ job must include a `jobId` that encodes `{type}:{userId}` to ensure idempotency.
- Workers must handle failures gracefully and log with structured output.
- Dead-letter events must be logged with full job data for debugging.

---

## Dependency Injection Pattern

ProHire uses a **custom lightweight DI container** — no third-party DI library.

### How it works

```typescript
// src/core/container/container.ts
type Factory<T> = () => T;

class Container {
  private registry = new Map<string, unknown>();

  register<T>(key: string, factory: Factory<T>): void {
    this.registry.set(key, factory());
  }

  resolve<T>(key: string): T {
    const instance = this.registry.get(key);
    if (!instance) throw new Error(`Dependency not registered: ${key}`);
    return instance as T;
  }
}

export const container = new Container();
```

### Registration (in `app.ts`)

```typescript
import { container } from "./core/container/container";
import { db } from "./core/database/db";

// Repositories
container.register("authRepository", () => new AuthRepository(db));
container.register("jobRepository", () => new JobRepository(db));

// Services
container.register(
  "authService",
  () =>
    new AuthService(
      container.resolve("authRepository"),
      container.resolve("emailQueue"),
    ),
);

// Controllers
container.register(
  "authController",
  () => new AuthController(container.resolve("authService")),
);
```

### Resolution in routes

```typescript
// auth.routes.ts
import { Router } from "express";
import { container } from "../../core/container/container";
import { AuthController } from "./auth.controller";
import { validate } from "../../core/middlewares/validate.middleware";
import { RegisterCandidateDto } from "./auth.dto";

const router = Router();
const authController = container.resolve<AuthController>("authController");

router.post(
  "/register/candidate",
  validate(RegisterCandidateDto),
  authController.registerCandidate,
);

export default router;
```

---

## Implementation Reference

### asyncHandler utility

```typescript
// src/core/utils/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncFn = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export const asyncHandler =
  (fn: AsyncFn): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
```

### AppError base class

```typescript
// src/core/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class DuplicateApplicationError extends AppError {
  constructor() {
    super(
      "You have already applied to this job.",
      409,
      "DUPLICATE_APPLICATION",
    );
  }
}

export class JobInactiveError extends AppError {
  constructor() {
    super("This job is no longer accepting applications.", 400, "JOB_INACTIVE");
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super(
      "Please verify your email before logging in.",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}
```

### Global error handler

```typescript
// src/core/errors/error-handler.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";
import { logger } from "../utils/logger";

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  // Unexpected error
  logger.error({ err, requestId: req.id }, "Unhandled error");

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      statusCode: 500,
    },
  });
};
```

### Auth service — registration (atomic)

Registration creates a user and their verification token **atomically** via `AuthRepository.createUserWithVerificationToken`, which opens a single `db.transaction` internally. The email is enqueued only after the transaction commits. This prevents the orphaned-user bug (user row exists but no verification token) that would occur if the server crashed between two separate DB calls.

```typescript
// Registration pattern — both registerCandidate and registerCompany follow this
const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
const rawToken = generateToken();
const tokenHash = hashToken(rawToken);
const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_MS);
const user = await this.authRepository.createUserWithVerificationToken({
  email: input.email,
  passwordHash,
  role: "candidate", // or "company"
  tokenHash,
  expiresAt,
});
await this.emailQueue.enqueueVerificationEmail(user.email, rawToken);
```

The repository method owns the transaction — the service never touches `db` directly.

### Resend verification endpoint

`POST /api/v1/auth/resend-verification` — allows unverified users to request a new verification email.

**Behaviour:**
- Body: `{ email: string }`
- Always returns `200` with the same generic message regardless of outcome — no enumeration of account state
- Only sends an email when the account exists and is unverified; silently no-ops otherwise
- Rate limited: 5 requests per 15 minutes per IP

> **Phase 10 (production hardening):** Add a minimum response time floor (~200 ms via
> `sleep`) in `finally` to prevent timing-based enumeration. Deferred because the
> endpoint is already rate-limited to 5 req / 15 min per IP, making timing attacks
> impractical in the short term.

**Frontend must handle:**
1. After successful register (or on the "check your email" page), show a **resend button** with a countdown timer (e.g. 60 seconds) to prevent spam-clicking
2. On `200`, reset the timer and show a success toast
3. The timer state should survive page refreshes — persist the last-sent timestamp in `localStorage` and compute the remaining cooldown on mount

```typescript
// Suggested resend timer hook (frontend)
function useResendCooldown(cooldownMs = 60_000) {
  const STORAGE_KEY = "prohire:resend-sent-at";
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const sentAt = localStorage.getItem(STORAGE_KEY);
    if (!sentAt) return 0;
    const elapsed = Date.now() - Number(sentAt);
    return Math.max(0, Math.ceil((cooldownMs - elapsed) / 1000));
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const markSent = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setSecondsLeft(cooldownMs / 1000);
  };

  return { secondsLeft, canResend: secondsLeft === 0, markSent };
}
```

### Application service (transactional)

```typescript
// src/modules/applications/application.service.ts
import { DatabaseClient } from "../../core/database/db";
import { ApplicationRepository } from "./application.repository";
import { JobRepository } from "../jobs/job.repository";
import {
  DuplicateApplicationError,
  JobInactiveError,
  ConflictError,
} from "../../core/errors/AppError";

export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly jobRepository: JobRepository,
    private readonly db: DatabaseClient,
  ) {}

  async applyToJob(candidateId: string, jobId: string, coverLetter?: string) {
    return this.db.transaction(async (tx) => {
      const job = await this.jobRepository.findActiveById(jobId, tx);
      if (!job) throw new JobInactiveError();

      try {
        const application = await this.applicationRepository.create(
          { jobId, candidateId, coverLetter },
          tx,
        );
        return application;
      } catch (err: unknown) {
        // PostgreSQL unique violation code
        if (isUniqueConstraintError(err)) throw new DuplicateApplicationError();
        throw err;
      }
    });
  }

  async updateStage(
    applicationId: string,
    companyOwnerId: string,
    newStage: string,
    expectedVersion: number,
  ) {
    const result = await this.applicationRepository.updateStageWithVersion(
      applicationId,
      companyOwnerId,
      newStage,
      expectedVersion,
    );
    if (!result)
      throw new ConflictError(
        "Application was modified by another request. Please refresh and try again.",
      );
    return result;
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}
```

### Optimistic locking repository method

```typescript
// src/modules/applications/application.repository.ts (excerpt)
async updateStageWithVersion(
  id: string,
  companyOwnerId: string,
  stage: string,
  version: number
): Promise<ApplicationRow | null> {
  const result = await this.db.query<ApplicationRow>(
    `UPDATE applications a
     SET stage = $1, version = version + 1, updated_at = NOW()
     FROM jobs j
     WHERE a.id = $2
       AND a.version = $3
       AND a.job_id = j.id
       AND j.company_id IN (
         SELECT id FROM companies WHERE owner_id = $4
       )
     RETURNING a.*`,
    [stage, id, version, companyOwnerId]
  );
  return result.rows[0] ?? null;
}
```

### BullMQ email queue

```typescript
// src/core/queue/email.queue.ts
import { Queue } from "bullmq";
import { redis } from "../redis/redis";

export type EmailJobData =
  | { type: "verify-email"; to: string; token: string }
  | { type: "password-reset"; to: string; token: string }
  | { type: "stage-changed"; to: string; stage: string; jobTitle: string };

export class EmailQueue {
  private readonly queue: Queue<EmailJobData>;

  constructor() {
    this.queue = new Queue<EmailJobData>("email", {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }

  async enqueueVerificationEmail(to: string, token: string): Promise<void> {
    await this.queue.add(
      "verify-email",
      { type: "verify-email", to, token },
      { jobId: `verify-email:${to}` }, // idempotent: deduplicates by email
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
}
```

### Redis cache utility

```typescript
// src/core/redis/cache.ts
import { redis } from "./redis";
import { TTL } from "./ttl.constants";

export async function getOrSet<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

export async function invalidate(keyPattern: string): Promise<void> {
  const keys = await redis.keys(keyPattern);
  if (keys.length > 0) await redis.del(...keys);
}

// src/core/redis/ttl.constants.ts
export const TTL = {
  JOB_LIST: 300, // 5 minutes
  JOB_DETAIL: 600, // 10 minutes
  COMPANY_JOBS: 300, // 5 minutes
} as const;
```

---

## Docker Setup

### `docker-compose.yml`

```yaml
version: "3.9"

services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
    env_file:
      - ./backend/.env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend/src:/app/src

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: prohire
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  pg_data:
  redis_data:
```

---

## Docker Workflow

### Development (recommended)

Run databases in Docker, backend locally for hot reload and direct terminal access.

```bash
# Start infrastructure only
docker-compose up db redis adminer redisinsight

# Run backend locally in a separate terminal
cd backend && npm run dev
```

Backend connects to Docker databases via localhost:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/prohire
REDIS_URL=redis://localhost:6379
```

### Production Simulation

To test the full stack in Docker:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

### Infrastructure Services

| Service      | Purpose        | Port |
| ------------ | -------------- | ---- |
| db           | PostgreSQL 16  | 5432 |
| redis        | Redis 7        | 6379 |
| adminer      | PostgreSQL GUI | 8080 |
| redisinsight | Redis GUI      | 5540 |

### Files

- `docker-compose.yml` — development infrastructure only (db, redis, adminer, redisinsight). Backend service intentionally excluded.
- `docker-compose.prod.yml` — adds backend container for production simulation.

---

## Frontend Architecture Notes

### Auth state (Zustand)

```typescript
// src/store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  user: { id: string; email: string; role: string } | null;
  setAuth: (token: string, user: AuthState["user"]) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    { name: "prohire-auth" },
  ),
);
```

### API client with token injection

```typescript
// src/lib/api.ts
import axios from "axios";
import { useAuthStore } from "../store/auth.store";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // Attempt token refresh
      try {
        const { data } = await axios.post(
          "/api/v1/auth/refresh",
          {},
          { withCredentials: true },
        );
        useAuthStore.getState().setAuth(data.accessToken, data.user);
        err.config.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient.request(err.config);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);
```

### Optimistic UI for stage updates (TanStack Query)

```typescript
const mutation = useMutation({
  mutationFn: ({ stage, version }: { stage: string; version: number }) =>
    apiClient.patch(`/applications/${applicationId}/stage`, { stage, version }),
  onMutate: async ({ stage }) => {
    await queryClient.cancelQueries({ queryKey: ["applicants", jobId] });
    const prev = queryClient.getQueryData(["applicants", jobId]);
    queryClient.setQueryData(["applicants", jobId], (old: Application[]) =>
      old.map((a) => (a.id === applicationId ? { ...a, stage } : a)),
    );
    return { prev };
  },
  onError: (_err, _vars, ctx) => {
    queryClient.setQueryData(["applicants", jobId], ctx?.prev);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["applicants", jobId] });
  },
});
```

---

## Logging Standard

Use **pino** for structured JSON logging.

```typescript
// src/core/utils/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
});
```

Every log entry must include: `requestId`, `userId` (when authenticated), `method`, `path`, `statusCode`, `durationMs`.

---

## Phase Completion Checklist

Before marking a phase done:

- [ ] All new endpoints return correct HTTP status codes
- [ ] All new service methods have typed inputs and return values
- [ ] All new routes have Zod validation middleware applied
- [ ] Redis cache keys use the `prohire:` prefix and constants from `ttl.constants.ts`
- [ ] BullMQ jobs include idempotent `jobId`
- [ ] No `any` types introduced
- [ ] No business logic added to controllers
- [ ] No raw SQL added to services
- [ ] Docker containers still healthy (`docker-compose up` passes)
- [ ] Postman collection updated with new endpoints

---

## Common Pitfalls to Avoid

- Do not import `db` directly into service files — pass it through the repository layer only.
- Do not use `Promise.all` for writes that must be atomic — use a transaction.
- Do not return password hashes or token hashes in any API response.
- Do not cache admin endpoints — admin data must always be fresh.
- Do not skip the `version` check on stage updates — the optimistic lock must always enforce it.
- Do not use `any` as a temporary shortcut — define the type properly from the start.
- Do not send emails synchronously — always delegate to BullMQ.
