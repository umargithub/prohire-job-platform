CREATE TABLE company_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID        NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('owner', 'recruiter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_members_company_id ON company_members (company_id);
