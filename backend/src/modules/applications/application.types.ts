export const APPLICATION_STAGES = [
  "applied",
  "reviewed",
  "interview",
  "offered",
  "rejected",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const EMAIL_STAGES = ["reviewed", "interview", "offered", "rejected"] as const;
export type EmailStage = (typeof EMAIL_STAGES)[number];

export interface ApplicationRow {
  id: string;
  job_id: string;
  candidate_id: string;
  cover_letter: string | null;
  stage: ApplicationStage;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface ApplicationWithJobRow extends ApplicationRow {
  job_title: string;
  company_id: string;
  company_name: string;
}

export interface ApplicationWithCandidateRow extends ApplicationRow {
  candidate_email: string;
  full_name: string;
  avatar_url: string | null;
}

export interface ApplicationDetailRow extends ApplicationRow {
  job_title: string;
  candidate_email: string;
  full_name: string;
  bio: string | null;
  resume_url: string | null;
  avatar_url: string | null;
}

export interface PaginatedApplications<T> {
  applications: T[];
  total: number;
  page: number;
  limit: number;
}
