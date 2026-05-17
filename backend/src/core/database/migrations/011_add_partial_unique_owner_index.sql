CREATE UNIQUE INDEX idx_one_owner_per_company
ON company_members (company_id)
WHERE role = 'owner';
