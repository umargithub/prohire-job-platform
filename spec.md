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

| Action                        | Candidate | Company  | Admin |
| ----------------------------- | --------- | -------- | ----- |
| Register / Login              | ✅        | ✅       | —     |
| Create company profile        | —         | ✅       | —     |
| Post / edit / delete jobs     | —         | ✅ (own) | —     |
| Browse & search jobs          | ✅        | —        | —     |
| Apply to job                  | ✅        | —        | —     |
| Bookmark jobs                 | ✅        | —        | —     |
| Upload resume                 | ✅        | —        | —     |
| View own applications         | ✅        | —        | —     |
| View applicants per job       | —         | ✅ (own) | —     |
| Move applicant stage          | —         | ✅ (own) | —     |
| Platform stats                | —         | —        | ✅    |
| Soft-delete users / companies | —         | —        | ✅    |

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

#### `candidate_profiles`

```sql
CREATE TABLE candidate_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio        TEXT,
  resume_url VARCHAR(500),
  skills     TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidate_profiles_user ON candidate_profiles(user_id);
```

#### `jobs`

```sql
CREATE TABLE jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT NOT NULL,
  location     VARCHAR(255),
  type         job_type NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', title || ' ' || description)
  ) STORED
);

CREATE INDEX idx_jobs_company      ON jobs(company_id);
CREATE INDEX idx_jobs_active       ON jobs(is_active);
CREATE INDEX idx_jobs_search       ON jobs USING GIN(search_vector);
CREATE INDEX idx_jobs_type         ON jobs(type);
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
  │                 │                    │
  ├── candidate_profiles              jobs ◄───────────┐
  │                                    │               │
  └── applications ───────────────────►┘               │
        │                                          bookmarks ◄── users
        │
     (stage, version for optimistic locking)
```

**Relationships:**

- One `user` → one `company` (via owner_id)
- One `company` → many `jobs`
- One `user (candidate)` → many `applications`
- One `job` → many `applications`
- One `user (candidate)` → many `bookmarks`
- One `job` → many `bookmarks`
- `applications` has a composite unique on `(job_id, candidate_id)` to prevent duplicates

---

## 5. API Endpoint Reference

All endpoints are prefixed with `/api/v1`.

### 5.1 Auth (`/auth`)

| Method | Path                       | Auth   | Description                            |
| ------ | -------------------------- | ------ | -------------------------------------- |
| POST   | `/auth/register/candidate` | —      | Register as candidate                  |
| POST   | `/auth/register/company`   | —      | Register as company                    |
| POST   | `/auth/login`              | —      | Login (returns access + refresh token) |
| POST   | `/auth/refresh`            | —      | Rotate refresh token                   |
| POST   | `/auth/logout`             | Bearer | Revoke refresh token                   |
| GET    | `/auth/verify-email`       | —      | Verify email via token query param     |
| POST   | `/auth/forgot-password`    | —      | Send password reset email              |
| POST   | `/auth/reset-password`     | —      | Reset password via token               |
| GET    | `/auth/me`                 | Bearer | Get current user info                  |

### 5.2 Company (`/companies`)

| Method | Path             | Auth           | Description            |
| ------ | ---------------- | -------------- | ---------------------- |
| GET    | `/companies/:id` | Bearer         | Get company profile    |
| PATCH  | `/companies/:id` | Bearer (owner) | Update company profile |

### 5.3 Jobs (`/jobs`)

| Method | Path                       | Auth             | Description                     |
| ------ | -------------------------- | ---------------- | ------------------------------- |
| POST   | `/jobs`                    | Bearer (company) | Create job                      |
| GET    | `/jobs`                    | —                | Browse jobs (filter + paginate) |
| GET    | `/jobs/:id`                | —                | Get single job                  |
| PATCH  | `/jobs/:id`                | Bearer (owner)   | Update job                      |
| DELETE | `/jobs/:id`                | Bearer (owner)   | Soft deactivate job             |
| GET    | `/jobs/company/:companyId` | Bearer (owner)   | List company's own jobs         |
| GET    | `/jobs/:id/applicants`     | Bearer (company) | View applicants for a job       |

**Query params for `GET /jobs`:**

```
page      integer  default 1
limit     integer  default 20, max 100
keyword   string   full-text search on title/description
location  string   filter by location
type      job_type enum filter
```

### 5.4 Applications (`/applications`)

| Method | Path                      | Auth               | Description                    |
| ------ | ------------------------- | ------------------ | ------------------------------ |
| POST   | `/applications`           | Bearer (candidate) | Apply to a job                 |
| GET    | `/applications/me`        | Bearer (candidate) | My applications                |
| PATCH  | `/applications/:id/stage` | Bearer (company)   | Update stage (optimistic lock) |

**Stage update request body:**

```json
{
  "stage": "shortlisted",
  "version": 3
}
```

### 5.5 Bookmarks (`/bookmarks`)

| Method | Path                | Auth               | Description     |
| ------ | ------------------- | ------------------ | --------------- |
| POST   | `/bookmarks`        | Bearer (candidate) | Bookmark a job  |
| DELETE | `/bookmarks/:jobId` | Bearer (candidate) | Remove bookmark |
| GET    | `/bookmarks`        | Bearer (candidate) | List bookmarks  |

### 5.6 Candidate Profile (`/candidate`)

| Method | Path                  | Auth               | Description                       |
| ------ | --------------------- | ------------------ | --------------------------------- |
| POST   | `/candidate/profile`  | Bearer (candidate) | Create candidate profile          |
| GET    | `/candidate/profile`  | Bearer (candidate) | Get own profile                   |
| PUT    | `/candidate/profile`  | Bearer (candidate) | Update profile (full replacement) |

**Request body (POST / PUT):**

```json
{
  "full_name": "Jane Doe",
  "bio": "Full-stack developer with 3 years of experience.",
  "resume_url": "https://example.com/resume.pdf"
}
```

> Resume file upload (multipart) deferred to a later phase when S3/storage integration is added.

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
BEGIN TRANSACTION
  1. SELECT job WHERE id = :jobId AND is_active = true FOR UPDATE
  2. IF not found → raise JobInactiveError
  3. INSERT INTO applications (job_id, candidate_id, stage='applied')
     ON CONFLICT (job_id, candidate_id) → raise DuplicateApplicationError
  4. COMMIT
```

### 6.3 Optimistic Locking for Stage Updates

```
UPDATE applications
SET stage = :newStage, version = version + 1, updated_at = NOW()
WHERE id = :id AND version = :expectedVersion
RETURNING *;

IF rows_affected = 0 → raise ConflictError (409)
```

Client must always send the `version` field received from GET. Frontend implements retry on 409.

### 6.4 Redis Caching Strategy

| Cache Key                         | TTL    | Invalidated By                   |
| --------------------------------- | ------ | -------------------------------- |
| `jobs:list:{hash(query)}`         | 5 min  | Job create / update / deactivate |
| `job:{id}`                        | 10 min | Job update                       |
| `company:jobs:{companyId}:{page}` | 5 min  | Job create / update              |

All cache keys prefixed with `prohire:`.

### 6.5 BullMQ Queues

| Queue Name      | Job                   | Retry | Backoff         |
| --------------- | --------------------- | ----- | --------------- |
| `email`         | `verify-email`        | 3     | Exponential 5s  |
| `email`         | `password-reset`      | 3     | Exponential 5s  |
| `notifications` | `interview-scheduled` | 5     | Exponential 10s |
| `notifications` | `stage-changed`       | 3     | Exponential 5s  |

All jobs include a `jobId` = `{type}:{userId}:{timestamp}` for idempotency.

### 6.6 Rate Limiting

| Endpoint Group | Limit                  |
| -------------- | ---------------------- |
| `POST /auth/*` | 10 req / 15 min per IP |
| `GET /jobs`    | 100 req / min per IP   |
| Global         | 500 req / min per IP   |

Implemented via Redis sliding window.

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
| `JOB_INACTIVE`          | 400  | Job is no longer active     |
| `EMAIL_NOT_VERIFIED`    | 403  | Login blocked, verify email |
| `RATE_LIMITED`          | 429  | Too many requests           |
| `INTERNAL_ERROR`        | 500  | Unexpected server error     |

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
