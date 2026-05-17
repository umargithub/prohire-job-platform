export interface AdminUserRow {
  id: string;
  email: string;
  role: "candidate" | "company" | "admin";
  is_verified: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AdminCompanyRow {
  id: string;
  owner_id: string;
  name: string;
  is_deleted: boolean;
  created_at: Date;
}

// Intermediate types for stats aggregation queries
export interface UserStatsRow {
  total: string;
  candidates: string;
  companies: string;
  admins: string;
  verified: string;
  deleted: string;
}

export interface JobStatsRow {
  total: string;
  active: string;
}

export interface CompanyStatsRow {
  total: string;
  active: string;
}

export interface ApplicationStageRow {
  stage: string;
  count: string;
}
