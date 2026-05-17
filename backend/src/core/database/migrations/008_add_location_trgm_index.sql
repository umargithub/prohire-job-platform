CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_jobs_location_trgm ON jobs USING GIN (location gin_trgm_ops);
