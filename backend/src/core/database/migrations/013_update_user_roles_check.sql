-- Extend the role check constraint to support multi-level admin tiers.
-- PostgreSQL auto-names inline CHECK constraints as <table>_<column>_check.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('candidate', 'company', 'admin', 'super_admin', 'moderator'));
