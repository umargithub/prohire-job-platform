# ProHire — Product & Technical Specification

> **Version:** 1.0.0  
> **Status:** Active  
> **Stack:** Node.js · Express · TypeScript · PostgreSQL · Redis · BullMQ · Next.js

---

## 1. Overview

ProHire is a production-grade job board platform supporting three distinct user roles: **Candidate**, **Company**, and **Admin**. The system prioritises data integrity, concurrency safety, and performance at scale. This document covers domain modelling, API design, database schema, and engineering contracts.

| Documentation | Invoke DocsExplorer agent before implementing BullMQ, TanStack Query, PostgreSQL, Zod, and Pino |

---

## 2. User Roles & Permissions

| Action                        | Candidate | Company (owner) | Company (recruiter) | Admin |
| ----------------------------- | --------- | --------------- | ------------------- | ----- |
| Register / Login              | ✅        | ✅              | ✅                  | —     |
| Create company profile        | —         | ✅              | —                   | —     |
| Update company profile / logo | —         | ✅              | —                   | —     |
| Add / remove team members     | —         | ✅              | —                   | —     |
| Post / edit / delete jobs     | —         | ✅              | ✅                  | —     |
| Browse & search jobs          | ✅        | —               | —                   | —     |
| Apply to job (profile req'd)  | ✅        | —               | —                   | —     |
| Bookmark jobs                 | ✅        | —               | —                   | —     |
| Upload resume / avatar        | ✅        | —               | —                   | —     |
| View own applications         | ✅        | —               | —                   | —     |
| View applicants per job       | —         | ✅              | ✅                  | —     |
| Move applicant stage          | —         | ✅              | ✅                  | —     |
| Platform stats                | —         | —               | —                   | ✅    |
| Soft-delete users / companies | —         | —               | —                   | ✅    |

---

## 3. Database Schema

### 3.1 Enums

```sql
CREATE TYPE user_role AS ENUM ('candidate', 'company', 'admin');

CREATE TYPE application_stage AS ENUM (
  'applied',
  'shortlisted',
  'interview',
  'rejected',
  'hired'
);

CREATE TYPE job_type AS ENUM ('full_time', 'part_time', 'contract', 'remote', 'internship');
```

### 3.2 Tables

#### `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role NOT NULL,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users(email);
```

#### `companies`

```sql
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  website     VARCHAR(255),
  logo_url    VARCHAR(255),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_owner ON companies(owner_id);
```

#### `company_members`

```sql
CREATE TABLE company_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('owner', 'recruiter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_members_company_id ON company_members(company_id);

-- Enforces exactly one owner per company at the database level
CREATE UNIQUE INDEX idx_one_owner_per_company ON company_members(company_id) WHERE role = 'owner';
```

> `UNIQUE` on `user_id` means one user belongs to exactly one company. The owner row is inserted atomically when the company is created (`createCompanyWithOwner` uses `db.transaction`). Only the owner can invite/remove members or transfer ownership. All authorization checks for job and application access use `company_members`, not `companies.owner_id`.

#### `company_invites`

```sql
CREATE TABLE company_invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_company_invite UNIQUE (company_id, email)
);
```

> Token is a random 32-byte hex string sent in the invite email; only the hash is stored. Tokens expire after 48 hours. Re-inviting the same email deletes the old invite first (resend support). The `UNIQUE(company_id, email)` constraint prevents duplicate pending invites per company.

#### `candidate_profiles`

```sql
CREATE TABLE candidate_profiles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL,
  bio        TEXT,
  resume_url TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidate_profiles_user_id ON candidate_profiles(user_id);
```

> `full_name` is required. `avatar_url` and `resume_url` are set via dedicated upload endpoints (Cloudinary). A candidate must have a profile before they can apply to any job (`PROFILE_REQUIRED` enforced at the service layer).

#### `jobs`

```sql
CREATE TABLE jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT NOT NULL,
  location         VARCHAR(255),
  job_type         job_type NOT NULL,
  experience_level TEXT,
  salary_min       NUMERIC(12,2),
  salary_max       NUMERIC(12,2),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector    TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || description)
  ) STORED
);

CREATE INDEX idx_jobs_company      ON jobs(company_id);
CREATE INDEX idx_jobs_active       ON jobs(is_active);
CREATE INDEX idx_jobs_search       ON jobs USING GIN(search_vector);
CREATE INDEX idx_jobs_type         ON jobs(job_type);
CREATE INDEX idx_jobs_location_trgm ON jobs USING GIN(location gin_trgm_ops); -- trigram for fuzzy location search
```

#### `applications`

```sql
CREATE TABLE applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage        application_stage NOT NULL DEFAULT 'applied',
  version      INTEGER NOT NULL DEFAULT 0,   -- optimistic locking
  cover_letter TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_application UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_applications_job       ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_stage     ON applications(stage);
```

#### `bookmarks`

```sql
CREATE TABLE bookmarks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_bookmark UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_bookmarks_candidate ON bookmarks(candidate_id);
```

#### `verification_tokens`

```sql
CREATE TABLE verification_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) UNIQUE NOT NULL,
  type       VARCHAR(50) NOT NULL DEFAULT 'email_verification',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_tokens_user  ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
```

#### `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user  ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token_hash);
```

---

## 4. ER Diagram (text)

```
users ──────────────┬─────────────── companies
  │                 │ (owner_id)         │
  │                 │                    ├── company_members ◄── users (role: owner|recruiter)
  │                 │                    │        (partial UNIQUE: one owner per company)
  ├── candidate_profiles               ├── company_invites (token_hash, expires_at)
  │                                    │
  │                                   jobs
  │                                    │
  └── applications ───────────────────►┘
        │        (stage, version — optimistic locking)
        │
     bookmarks ◄── users
```

**Relationships:**

- One `user` → one `company` (via owner_id, UNIQUE)
- One `company` → many `company_members`; one `user` → one `company_members` row (UNIQUE on user_id)
- One `company` → many `jobs`
- One `user (candidate)` → one `candidate_profiles` (UNIQUE on user_id)
- One `user (candidate)` → many `applications`
- One `job` → many `applications`
- One `user (candidate)` → many `bookmarks`
- One `job` → many `bookmarks`
- `applications` has a composite unique on `(job_id, candidate_id)` to prevent duplicates

---

## 5. API Endpoint Reference

All endpoints are prefixed with `/api/v1`.

### 5.1 Auth (`/auth`)

| Method | Path                            | Auth   | Description                                    |
| ------ | ------------------------------- | ------ | ---------------------------------------------- |
| POST   | `/auth/register/candidate`      | —      | Register as candidate                          |
| POST   | `/auth/register/company`        | —      | Register as company                            |
| POST   | `/auth/login`                   | —      | Login (returns access + refresh token)         |
| POST   | `/auth/refresh`                 | —      | Rotate refresh token                           |
| POST   | `/auth/logout`                  | Bearer | Revoke refresh token                           |
| GET    | `/auth/verify-email`            | —      | Verify email via token query param             |
| POST   | `/auth/resend-verification`     | —      | Resend verification email (5 req/15 min per IP)|
| POST   | `/auth/forgot-password`         | —      | Send password reset email                      |
| POST   | `/auth/reset-password`          | —      | Reset password via token                       |
| GET    | `/auth/me`                      | Bearer | Get current user info                          |

### 5.2 Company (`/company`)

| Method | Path                          | Auth             | Description                              |
| ------ | ----------------------------- | ---------------- | ---------------------------------------- |
| POST   | `/company/profile`            | Bearer (company) | Create company profile                   |
| GET    | `/company/profile`            | Bearer (company) | Get own company profile (any member)     |
| PUT    | `/company/profile`            | Bearer (owner)   | Update company profile                   |
| PATCH  | `/company/profile/logo`       | Bearer (owner)   | Upload company logo (multipart)          |
| GET    | `/company/members`            | Bearer (company) | List team members                        |
| POST   | `/company/members/invite`     | Bearer (owner)   | Invite member by email (sends token)     |
| POST   | `/company/invites/accept`     | —                | Accept invite via token (public)         |
| POST   | `/company/transfer-ownership` | Bearer (owner)   | Transfer ownership to an existing member |
| DELETE | `/company/members/:userId`    | Bearer (owner)   | Remove recruiter (owner cannot be removed)|
| POST   | `/company/jobs`               | Bearer (company) | Create job                               |
| GET    | `/company/jobs`               | Bearer (company) | List company's own jobs                  |
| GET    | `/company/jobs/:id`           | Bearer (company) | Get single company job                   |
| PATCH  | `/company/jobs/:id`           | Bearer (company) | Update job                               |
| DELETE | `/company/jobs/:id`           | Bearer (company) | Soft deactivate job                      |

### 5.3 Jobs (`/jobs`)

| Method | Path                          | Auth             | Description                              |
| ------ | ----------------------------- | ---------------- | ---------------------------------------- |
| GET    | `/jobs`                       | —                | Browse jobs (filter + paginate)          |
| GET    | `/jobs/:id`                   | —                | Get single job                           |
| GET    | `/jobs/:jobId/applications`   | Bearer (company) | List applicants for a job (any member)   |

> Job CRUD (create, update, delete) lives under `/company/jobs` — see §5.2.

**Query params for `GET /jobs`:**

```
page             integer   default 1
limit            integer   default 20, max 100
keyword          string    full-text search (GIN index on title + description)
location         string    fuzzy match via pg_trgm
job_type         job_type  enum filter
experience_level string    filter
salary_min       number    minimum salary filter
salary_max       number    maximum salary filter
```

**Query params for `GET /jobs/:jobId/applications`:**

```
page    integer  default 1
limit   integer  default 20, max 100
stage   string   filter by application_stage enum
```

### 5.4 Applications (`/applications`)

| Method | Path                       | Auth               | Description                                      |
| ------ | -------------------------- | ------------------ | ------------------------------------------------ |
| POST   | `/applications`            | Bearer (candidate) | Apply to a job (profile required)                |
| GET    | `/applications/my`         | Bearer (candidate) | My applications with job info (paginated)        |
| GET    | `/applications/:id`        | Bearer (company)   | Full application detail (candidate profile data) |
| PATCH  | `/applications/:id/stage`  | Bearer (company)   | Update application stage (optimistic lock)       |

> `GET /jobs/:jobId/applications` — list all applicants for a job — lives in the jobs module (§5.3).

**Stage update body:**

```json
{
  "stage": "shortlisted",
  "version": 3
}
```

> `version` is the value received from the last GET. If the record was modified concurrently, the server returns `409 CONFLICT`. The client must refresh and retry.

**Application detail response (`GET /applications/:id`) includes:**
- All base application fields (`id`, `job_id`, `stage`, `version`, `cover_letter`, timestamps)
- Candidate: `full_name`, `candidate_email`, `bio`, `resume_url`, `avatar_url`

### 5.5 Bookmarks (`/bookmarks`)

| Method | Path                | Auth               | Description     |
| ------ | ------------------- | ------------------ | --------------- |
| POST   | `/bookmarks`        | Bearer (candidate) | Bookmark a job  |
| DELETE | `/bookmarks/:jobId` | Bearer (candidate) | Remove bookmark |
| GET    | `/bookmarks`        | Bearer (candidate) | List bookmarks  |

### 5.6 Candidate Profile (`/candidate`)

| Method | Path                          | Auth               | Description                        |
| ------ | ----------------------------- | ------------------ | ---------------------------------- |
| POST   | `/candidate/profile`          | Bearer (candidate) | Create candidate profile           |
| GET    | `/candidate/profile`          | Bearer (candidate) | Get own profile                    |
| PUT    | `/candidate/profile`          | Bearer (candidate) | Update profile (full replacement)  |
| PATCH  | `/candidate/profile/resume`   | Bearer (candidate) | Upload resume (multipart, 10/hr)   |
| PATCH  | `/candidate/profile/avatar`   | Bearer (candidate) | Upload avatar (multipart, 10/hr)   |

**Request body (POST / PUT):**

```json
{
  "full_name": "Jane Doe",
  "bio": "Full-stack developer with 3 years of experience.",
  "resume_url": "https://example.com/resume.pdf",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

File uploads go to Cloudinary via multipart form. The previous file is deleted from Cloudinary on replacement. Accepted types: resume (`pdf`, `doc`, `docx`), avatar (`jpeg`, `png`, `webp`).

### 5.7 Admin (`/admin`)

| Method | Path                   | Auth           | Description         |
| ------ | ---------------------- | -------------- | ------------------- |
| GET    | `/admin/users`         | Bearer (admin) | List all users      |
| DELETE | `/admin/users/:id`     | Bearer (admin) | Soft delete user    |
| DELETE | `/admin/companies/:id` | Bearer (admin) | Soft delete company |
| GET    | `/admin/stats`         | Bearer (admin) | Platform statistics |

---

## 6. Core Engineering Contracts

### 6.1 Authentication Flow

1. User registers → password bcrypt-hashed, `is_verified = false`
2. Verification email job queued via BullMQ (idempotent: skip if already verified)
3. User clicks link → token validated → `is_verified = true`
4. Login blocked if `is_verified = false`
5. On successful login → issue signed JWT (15 min) + refresh token (7 days, stored hashed)
6. Refresh endpoint: validate refresh token, revoke old, issue new pair (rotation)

### 6.2 Job Application (Transactional)

```
PRE-CHECK (outside transaction)
  1. SELECT candidate_profiles WHERE user_id = :candidateId
  2. IF not found → raise ProfileRequiredError (403)

BEGIN TRANSACTION
  3. SELECT job WHERE id = :jobId AND is_active = true FOR UPDATE
  4. IF not found → raise JobInactiveError
  5. INSERT INTO applications (job_id, candidate_id, stage='applied')
     ON CONFLICT (job_id, candidate_id) → raise DuplicateApplicationError
  6. COMMIT
```

> Profile check is intentionally outside the transaction to avoid holding a lock while doing a separate table read. The check is not a guarantee (profile could be deleted between check and insert) but that edge case is acceptable.

### 6.3 Optimistic Locking for Stage Updates

```sql
UPDATE applications a
SET stage = $1, version = version + 1, updated_at = NOW()
FROM jobs j
WHERE a.id = $2
  AND a.version = $3
  AND a.job_id = j.id
  AND j.company_id IN (
    SELECT company_id FROM company_members WHERE user_id = $4
  )
RETURNING a.*;
```

- If `rows_affected = 0` → raise `ConflictError` (409 `CONFLICT`)
- Authorization uses `company_members` (not `companies.owner_id`) so both owners and recruiters can update stage
- Client always sends the `version` received from the last GET response
- On 409, the frontend must refetch and retry with the new `version`

### 6.4 Redis Caching Strategy

| Cache Key                              | TTL    | Invalidated By                          |
| -------------------------------------- | ------ | --------------------------------------- |
| `prohire:jobs:list:{hash(query)}`      | 5 min  | Job create / update / deactivate        |
| `prohire:job:{id}`                     | 10 min | Job update / deactivate                 |
| `prohire:company:jobs:{companyId}`     | 5 min  | Job create / update / delete            |
| `prohire:company:profile:{companyId}`  | 5 min  | Profile update / logo upload            |

> Cache key for company profile uses `companyId` (not `userId`) so all members of the same company share one cache entry. All keys use the `prohire:` prefix (defined in `ttl.constants.ts`).

### 6.5 BullMQ Queues

| Queue Name      | Job                   | jobId pattern                     | Retry | Backoff         |
| --------------- | --------------------- | --------------------------------- | ----- | --------------- |
| `email`         | `verify-email`        | `verify-email:{email}`            | 3     | Exponential 5s  |
| `email`         | `password-reset`      | `password-reset:{email}`          | 3     | Exponential 5s  |
| `email`         | `company-invite`      | `company-invite:{email}`          | 3     | Exponential 5s  |
| `email`         | `stage-changed`       | `stage-changed:{email}:{ts}`      | 3     | Exponential 5s  |
| `notifications` | `interview-scheduled` | `interview-scheduled:{userId}:{ts}`| 5    | Exponential 10s |

`jobId` is set on every job for idempotency. `verify-email` and `company-invite` are keyed only by email (deduplicates concurrent requests). `stage-changed` includes a timestamp to allow multiple notifications per candidate.

### 6.6 Rate Limiting

| Endpoint Group                        | Limit                    |
| ------------------------------------- | ------------------------ |
| `POST /auth/*`                        | 10 req / 15 min per IP   |
| `POST /auth/resend-verification`      | 5 req / 15 min per IP    |
| `GET /jobs`, `GET /jobs/:id`          | 60 req / min per IP      |
| `PATCH /candidate/profile/resume`     | 10 req / hr per user     |
| `PATCH /candidate/profile/avatar`     | 10 req / hr per user     |
| Global                                | 500 req / min global     |

Implemented via Redis sorted-set sliding window (custom middleware — no `express-rate-limit`).

---

## 7. Error Response Format

All errors follow a consistent envelope:

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_APPLICATION",
    "message": "You have already applied to this job.",
    "statusCode": 409
  }
}
```

### Standard Error Codes

| Code                    | HTTP | Description                 |
| ----------------------- | ---- | --------------------------- |
| `VALIDATION_ERROR`      | 422  | DTO validation failed       |
| `UNAUTHORIZED`          | 401  | Missing or invalid token    |
| `FORBIDDEN`             | 403  | Insufficient role           |
| `NOT_FOUND`             | 404  | Resource not found          |
| `DUPLICATE_APPLICATION` | 409  | Already applied             |
| `CONFLICT`              | 409  | Optimistic lock mismatch    |
| `JOB_INACTIVE`          | 400  | Job is no longer active                      |
| `EMAIL_NOT_VERIFIED`    | 403  | Login blocked, verify email                  |
| `PROFILE_REQUIRED`      | 403  | Must complete candidate profile before applying |
| `RATE_LIMITED`          | 429  | Too many requests                            |
| `INTERNAL_ERROR`        | 500  | Unexpected server error                      |

---

## 8. Folder Structure

```
prohire/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.repository.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.dto.ts
│   │   │   │   └── auth.types.ts
│   │   │   ├── users/
│   │   │   ├── jobs/
│   │   │   ├── applications/
│   │   │   ├── companies/
│   │   │   ├── bookmarks/
│   │   │   └── admin/
│   │   ├── core/
│   │   │   ├── database/
│   │   │   │   ├── db.ts
│   │   │   │   └── migrations/
│   │   │   ├── redis/
│   │   │   │   └── redis.ts
│   │   │   ├── queue/
│   │   │   │   ├── queue.ts
│   │   │   │   └── workers/
│   │   │   ├── middlewares/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── role.middleware.ts
│   │   │   │   ├── rate-limit.middleware.ts
│   │   │   │   ├── request-logger.middleware.ts
│   │   │   │   └── request-id.middleware.ts
│   │   │   ├── errors/
│   │   │   │   ├── AppError.ts
│   │   │   │   ├── error-handler.middleware.ts
│   │   │   │   └── error-codes.ts
│   │   │   └── container/
│   │   │       └── container.ts       -- Lightweight DI container
│   │   ├── shared/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── validators/
│   │   ├── config/
│   │   │   └── index.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── Dockerfile                   -- Dev infra only (PostgreSQL, Redis, Adminer, RedisInsight)
│   ├── docker-compose.yml
│   ├── docker-compose-prod.yml      -- Full stack including backend container
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/
    │   │   │   ├── login/
    │   │   │   └── register/
    │   │   ├── (dashboard)/
    │   │   │   ├── candidate/
    │   │   │   └── company/
    │   │   ├── jobs/
    │   │   └── admin/
    │   ├── components/
    │   ├── hooks/
    │   ├── lib/
    │   │   ├── api.ts
    │   │   └── queryClient.ts
    │   ├── store/
    │   │   └── auth.store.ts      -- Zustand
    │   └── types/
    └── package.json
```

---

## 9. Non-Functional Requirements

| Concern     | Requirement                                                      |
| ----------- | ---------------------------------------------------------------- |
| Type safety | No `any` types permitted anywhere in the codebase                |
| Separation  | Zero business logic inside controllers                           |
| Validation  | All inbound DTOs validated via Zod before reaching service layer |
| HTTP codes  | Must be semantically correct per RFC 7231                        |
| Logging     | Structured JSON logs with request ID, timestamp, level           |
| Security    | Helmet, CORS allowlist, bcrypt cost factor ≥ 12                  |
| Testing     | Integration tests for auth flow and application creation         |
| Docs        | OpenAPI spec auto-generated and served at `/api/v1/docs`         |

Note: Databases run in Docker always. Backend runs locally during development via `npm run dev`. Use `docker-compose.prod.yml` for full stack simulation.

## 10. Environment Variables

```env
# Server
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://postgres:password@db:5432/prohire

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@prohire.dev

# App
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:4000
```
