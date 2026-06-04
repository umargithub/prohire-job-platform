export interface AdminUserRow {
  id: string;
  email: string;
  role: "candidate" | "company" | "admin" | "super_admin" | "moderator";
  is_verified: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AdminCompanyRow {
  id: string;
  owner_id: string;
  owner_email: string;
  name: string;
  is_deleted: boolean;
  created_at: Date;
}

export interface AdminJobRow {
  id: string;
  company_id: string;
  company_name: string;
  title: string;
  location: string | null;
  job_type: "remote" | "hybrid" | "onsite";
  experience_level: "junior" | "mid" | "senior";
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Intermediate types for stats aggregation queries
export interface UserStatsRow {
  total: string;
  candidates: string;
  companies: string;
  admins: string;
  super_admins: string;
  moderators: string;
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
