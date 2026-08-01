# CLAUDE.md — ProHire Development Guide

> Source of truth for AI-assisted development. Read in full before writing any code.

---

## Project Identity

**Name:** ProHire  
**Type:** Production-grade job board SaaS (portfolio / hiring showcase)  
**Backend:** Node.js + Express + TypeScript + PostgreSQL + Redis + BullMQ  
**Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + TanStack Query + Zustand  
**Goal:** Impress senior engineers with architecture decisions, not just functionality.

---

## External Documentation

Use the **DocsExplorer** agent to fetch live docs before implementing any library-specific code. Do not rely on training knowledge.

Invoke for: **pg**, **BullMQ**, **TanStack Query**, **Zod**, **Pino**, and any library where the API may have changed.

---

## Phase Sequence

```
Phase 1  ✅ Project skeleton + Docker
Phase 2  ✅ Database schema + migrations
Phase 3  ✅ Authentication system
Phase 4  ✅ Company job management (CRUD + cache)
Phase 5  ✅ Candidate job browsing (filters + rate limit) + candidate profile
Phase 6  ✅ Application system
Phase 7  ✅ Optimistic locking for stage transitions
Phase 8  ✅ Background jobs (BullMQ)
Phase 9  ✅ Admin module
Phase 10 ✅ Production hardening
Frontend → In progress  ← NEXT
Deploy   → After frontend is complete
```

---

## Code Rules — Non-Negotiable

### TypeScript

- **Zero `any` types.** Define an explicit interface or type alias if you cannot infer the type.
- Use `strict: true` in `tsconfig.json`.
- All function return types must be explicitly annotated.
- Use `unknown` over `any` when the shape is genuinely unknown; narrow before use.

### Architecture

- **Controllers are thin.** Exactly three steps: call `asyncHandler`, extract validated DTO from `req`, call service, return response.
- **Routes call their own module's controller only.** Cross-module work goes through services.
- **Services are the reusable layer.** A controller may call any module's service. Services are not coupled to HTTP.
- **Services own all business logic.** No SQL in services — delegate to repositories.
- **Repositories own all SQL.** No business decisions in repositories.
- **No cross-module repository imports.** Services may call other services; repositories may not call other repositories.
- **Types, mappers, and responses belong to the module that owns the entity.** `JobRow`, `JobResponse`, `toJobResponse` all live in the `jobs` module.

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

- Every async route handler must be wrapped in `asyncHandler`. Never use raw try/catch in controllers.
- Throw typed `AppError` subclasses from the service layer.
- Never expose stack traces in production responses.

### Validation

- All request bodies validated with **Zod** via a `validate(schema)` middleware at the route level.
- Return `422 VALIDATION_ERROR` with field-level errors on failure.

### SQL & Database

- All queries use parameterised statements. No string interpolation in SQL.
- Use transactions for any multi-step write where partial failure must be prevented.
- Migrations are numbered sequentially: `001_create_users.sql`, `002_create_companies.sql`, etc.
- Never drop a column in a migration — add a new column and migrate data.

### Caching

- All Redis cache keys must be prefixed with `prohire:`.
- Cache write-through: invalidate on every mutation, never stale-read.
- TTL must be defined as a named constant in `src/core/redis/ttl.constants.ts`.

### Queue Jobs

- Every BullMQ job must include a `jobId` for idempotency. Token-based emails use `{type}:{email}:{token}`; non-token events use `{type}:{entityId}:{event}`.
- Workers must handle failures gracefully and log with structured output.
- Dead-letter events must be logged with full job data.

---

## Dependency Injection

ProHire uses a **custom lightweight DI container** at `src/core/container/container.ts` — no third-party DI library.

- `container.register(key, factory)` — calls the factory immediately and stores the result.
- `container.resolve<T>(key)` — retrieves the stored instance.
- Registration order matters: register leaves before roots (repositories before services, services before controllers).
- Routes resolve their controller via `container.resolve<ControllerClass>("key")`.

---

## Key Implementation Notes

### Registration (atomic)

User + verification token are created in a single transaction. Email is enqueued only after commit. `AuthService` receives `db: DatabaseClient` as its third constructor argument solely to own this transaction boundary — never for direct queries.

### Resend verification

`POST /api/v1/auth/resend-verification` — always returns `200` regardless of outcome (no account enumeration). Rate limited: 5 req / 15 min per IP. `withTimingFloor` (~200ms) applied in `finally` to prevent timing-based enumeration.

### Application service

`applyToJob` checks candidate profile existence first (`ProfileRequiredError` 403 if missing). No transaction — the unique constraint on `(job_id, candidate_id)` handles duplicate prevention at the DB level.

`updateStage` fetches the application via `findById` first — this both produces a clear 404 instead of a silent conflict, and supplies the current `stage` (plus candidate email / job title for the notification email, reused as-is since they don't change) needed to validate the transition before the version-locked UPDATE runs. Stage moves are forward-only within `reviewed → interview → offered`; `rejected` is a terminal state reachable from any active stage but not reversible from it. Same-stage and backward moves throw `InvalidStageTransitionError` (400 `INVALID_STAGE_TRANSITION`) instead of silently re-firing the "stage changed" notification email.

### Optimistic locking

Authorization uses `company_members` JOIN (not `companies.owner_id`) so owners and recruiters both have access. The `version` field must always be checked — never skip it.

### Company members (multi-seat)

- `company_members` table: `role IN ('owner', 'recruiter')`, `UNIQUE` on `user_id`.
- Partial unique index (`WHERE role = 'owner'`) enforces one owner per company at DB level.
- `resolveCompanyAsMember` — owner + recruiter (jobs, applications).
- `resolveCompanyAsOwner` — owner only (profile, logo, members, ownership transfer).
- Invite flow: owner POSTs email → token stored hashed → invitee accepts via token → atomically inserts member + deletes invite.
- Ownership transfer is atomic: current owner → recruiter, target → owner, updates `companies.owner_id`.

### Candidate avatar

`PATCH /api/v1/candidate/profile/avatar` — multipart, field `avatar`, accepts jpeg/png/webp, 10/hr rate limit. Old avatar deleted from Cloudinary on replacement.

### Bookmarks (candidate only)

Migration `015_create_bookmarks.sql` — `bookmarks (id, candidate_id, job_id, created_at)`, unique on `(candidate_id, job_id)`.

Module at `src/modules/bookmarks/` — `BookmarkRepository`, `BookmarkService`. Handlers live on `CandidateController` (injected as second constructor arg) because routes are under the `/candidate/` URL space.

Endpoints:
- `GET /api/v1/candidate/bookmarks?page=` — paginated with job info
- `POST /api/v1/candidate/bookmarks` — body: `{ jobId }`
- `DELETE /api/v1/candidate/bookmarks/:jobId`

### BullMQ connection

Pass `{ host, port }` (from `parseRedisUrl`) — NOT a Redis instance. BullMQ 5.x bundles its own ioredis.

### Redis TTLs

`JOB_LIST: 300`, `JOB_DETAIL: 600`, `COMPANY_JOBS: 300`, `COMPANY_PROFILE: 300`. Cache company profile by `companyId`, not `userId`.

---

## Docker

### Infrastructure Services

| Service      | Purpose        | Port |
| ------------ | -------------- | ---- |
| db           | PostgreSQL 16  | 5432 |
| redis        | Redis 7        | 6379 |
| adminer      | PostgreSQL GUI | 8080 |
| redisinsight | Redis GUI      | 5540 |

### Dev Workflow (recommended)

Run infra in Docker, backend locally for hot reload:

```bash
docker-compose up db redis adminer redisinsight
cd backend && npm run dev
```

`docker-compose.yml` — infra only. `docker-compose.prod.yml` — adds backend container for production simulation.

---

## Logging

Use **pino**. Every log entry must include: `requestId`, `userId` (when authenticated), `method`, `path`, `statusCode`, `durationMs`.

---

## Frontend Architecture

### Stack

| Concern      | Library                                        |
| ------------ | ---------------------------------------------- |
| Framework    | Next.js 14 (App Router)                        |
| Language     | TypeScript strict                              |
| Styling      | Tailwind CSS + shadcn/ui (Radix primitives)    |
| Server state | TanStack Query v5                              |
| Client state | Zustand (auth/session only)                    |
| Forms        | react-hook-form + @hookform/resolvers + zod    |
| Toasts       | sonner (via shadcn)                            |

### Route Groups

```
app/
├── (auth)/          # No navbar — centered card layout
│   ├── login/
│   ├── register/candidate/
│   ├── register/company/
│   ├── verify-email/          # reads ?token=
│   ├── forgot-password/
│   └── reset-password/        # reads ?token=
├── (main)/          # Navbar + Footer
│   ├── jobs/                  # public
│   │   ├── page.tsx           # browse + filters
│   │   └── [id]/page.tsx      # detail + apply
│   ├── candidate/             # AuthGuard role=candidate
│   │   ├── profile/
│   │   └── applications/
│   ├── company/               # AuthGuard role=company
│   │   ├── profile/
│   │   ├── jobs/ → new/, [id]/edit/, [id]/applicants/
│   │   └── members/
│   └── admin/                 # AuthGuard roles=[admin,super_admin,moderator]
│       ├── page.tsx           # stats
│       ├── users/
│       ├── companies/
│       └── jobs/
└── invites/accept/            # public — reads ?token=
```

### Key Frontend Files

| File | Purpose |
|---|---|
| `src/lib/api.ts` | Axios instance + Bearer token interceptor + 401 refresh |
| `src/store/auth.store.ts` | Zustand store — `{ accessToken, user, setAuth, clearAuth }` |
| `src/providers/query-provider.tsx` | QueryClient `staleTime: 60_000`, `retry: 1` + Toaster |
| `src/lib/query-keys.ts` | Centralized query key factory (jobs, candidate, company, admin) |
| `src/lib/api/*.ts` | Typed async functions wrapping `apiClient` — one file per module |
| `src/types/api.ts` | Frontend types mirroring backend response shapes |
| `src/components/auth/auth-guard.tsx` | Client-side role guard — redirects if unauthenticated or wrong role |
| `src/hooks/use-resend-cooldown.ts` | 60s cooldown persisted in localStorage (`prohire:resend-sent-at`) |
| `src/hooks/use-debounce.ts` | 300ms debounce for search inputs |
| `src/lib/permissions.ts` | Centralised admin role array |

### Auth Guard

Client-side only (token lives in Zustand/localStorage). Each protected portal has a `layout.tsx` wrapping children in `<AuthGuard role="...">`. Shows spinner while hydrating, then redirects to `/login` or `/` on failure. **UX-only — backend always validates the JWT.**

### Query staleTime Overrides

| Data | staleTime | Reason |
|---|---|---|
| Jobs list/detail | `5 * 60 * 1000` | Matches backend Redis TTL |
| Company/candidate profile | `5 * 60 * 1000` | Same |
| Applications | `30_000` | Should feel fresh |
| Admin data | `0` | Always fresh |
| Auth user | `Infinity` | Changes only on logout |

### Navbar Role-Aware Links

| Role | Nav items |
|---|---|
| Guest | Jobs · Login · Register (dropdown: Candidate / Company) |
| candidate | Jobs · My Applications · Profile · Logout |
| company | My Jobs · Team · Profile · Logout |
| admin / super_admin / moderator | Dashboard · Users · Companies · Jobs · Logout |

### File Uploads

Multipart — `Content-Type` set automatically by Axios. Field names:
- `PATCH /candidate/profile/avatar` → `avatar`
- `PATCH /candidate/profile/resume` → `resume`
- `PATCH /company/profile/logo` → `logo`

### Pagination

Keep `page` in URL search params so back navigation works.

### Error Handling in Mutations

Extract `response.data.error.code` and map to user-facing messages. Map keys: `DUPLICATE_APPLICATION`, `PROFILE_REQUIRED`, `JOB_INACTIVE`, `CONFLICT`.

---

## Phase Completion Checklist

- [ ] All new endpoints return correct HTTP status codes
- [ ] All new service methods have typed inputs and return values
- [ ] All new routes have Zod validation middleware applied
- [ ] Redis cache keys use the `prohire:` prefix and constants from `ttl.constants.ts`
- [ ] BullMQ jobs include idempotent `jobId`
- [ ] No `any` types introduced
- [ ] No business logic added to controllers
- [ ] No raw SQL added to services
- [ ] Docker containers still healthy
- [ ] Postman collection updated

---

## Common Pitfalls

**Backend**
- Do not import `db` into services for queries — delegate to repositories. Exception: service may hold `db` to own a transaction boundary and pass `PoolClient` down.
- Do not use `Promise.all` for writes that must be atomic — use a transaction.
- Do not return password hashes or token hashes in any API response.
- Do not cache admin endpoints — admin data must always be fresh.
- Do not skip the `version` check on stage updates — the optimistic lock must always enforce it.
- Do not send emails synchronously — always delegate to BullMQ.
- Do not use `companies.owner_id` for authorization — use `company_members` so recruiters have access too.
- Do not allow a candidate to apply without a profile — check `findProfileByUserId` before inserting.
- Do not use `LEFT JOIN candidate_profiles` in applicant queries — use `INNER JOIN` (profile is guaranteed at apply time).
- Do not wrap `applyToJob` in a transaction — unique constraint handles duplicate prevention.
- Do not define entity types/mappers/responses outside the owning module.
- Do not cache company profile by `userId` — key by `companyId` so all members share one entry.
- Do not register a DI dependency before its own dependencies are registered.
- Do not insert a second owner into `company_members` — use `transferOwnership` instead.
- Do not use subquery `IN (SELECT company_id ...)` for authorization — use an explicit `JOIN company_members`.
- Do not use email-only jobIds for token-based emails — use `{type}:{email}:{token}`.

**Frontend**
- Do not put server state in Zustand — that is TanStack Query's job.
- Do not call `apiClient` directly inside components — always use `useQuery` / `useMutation`.
- Do not hardcode role strings outside `types/api.ts`.
- Do not use `staleTime: 0` for public job data — use `5 * 60 * 1000`.
- Do not rely on `AuthGuard` for real security — it is UX-only.
- Do not scatter admin role arrays across components — use `lib/permissions.ts`.
- Do not forget to send `version` alongside `stage` on stage update.
- Do not use `next.config.ts` — Next.js 14 only supports `next.config.mjs`.
- `types/api.ts` is manually maintained — generate from OpenAPI once backend stabilises.
