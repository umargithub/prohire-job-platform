CREATE TABLE jobs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID        NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  description      TEXT        NOT NULL,
  location         TEXT,
  job_type         TEXT        NOT NULL CHECK (job_type IN ('remote', 'hybrid', 'onsite')),
  experience_level TEXT        NOT NULL CHECK (experience_level IN ('junior', 'mid', 'senior')),
  salary_min       NUMERIC(12, 2),
  salary_max       NUMERIC(12, 2),
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_salary_range CHECK (
    salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min
  )
);

CREATE INDEX idx_jobs_company_id       ON jobs (company_id);
CREATE INDEX idx_jobs_is_active        ON jobs (is_active);
CREATE INDEX idx_jobs_job_type         ON jobs (job_type);
CREATE INDEX idx_jobs_experience_level ON jobs (experience_level);
