CREATE TABLE applications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID        NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  candidate_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  cover_letter TEXT,
  stage        TEXT        NOT NULL DEFAULT 'applied'
                           CHECK (stage IN ('applied', 'reviewed', 'interview', 'offered', 'rejected')),
  version      INTEGER     NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_application UNIQUE (job_id, candidate_id)
);

CREATE INDEX idx_applications_job_id       ON applications (job_id);
CREATE INDEX idx_applications_candidate_id ON applications (candidate_id);
CREATE INDEX idx_applications_stage        ON applications (stage);
