ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_deleted     ON users     (is_deleted);
CREATE INDEX IF NOT EXISTS idx_companies_is_deleted ON companies (is_deleted);
