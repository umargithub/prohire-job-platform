CREATE TABLE candidate_profiles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL,
  bio        TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_candidate_profiles_user_id ON candidate_profiles (user_id);
