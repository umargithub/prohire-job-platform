export type CompanyMemberRole = "owner" | "recruiter";

export interface CompanyInviteRow {
  id: string;
  company_id: string;
  email: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface CompanyMemberRow {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyMemberRole;
  created_at: Date;
}

export interface CompanyMemberWithEmailRow extends CompanyMemberRow {
  email: string;
}

export interface CompanyRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

