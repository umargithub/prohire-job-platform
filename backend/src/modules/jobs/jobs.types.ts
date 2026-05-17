export interface JobRow {
  id: string;
  company_id: string;
  title: string;
  description: string;
  location: string | null;
  job_type: "remote" | "hybrid" | "onsite";
  experience_level: "junior" | "mid" | "senior";
  salary_min: string | null; // pg returns NUMERIC as string
  salary_max: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface JobWithCompanyRow extends JobRow {
  company_name: string;
  company_logo_url: string | null;
}

export interface FindJobsResult {
  jobs: JobWithCompanyRow[];
  total: number;
}

export interface PaginatedJobs {
  jobs: JobWithCompanyRow[];
  total: number;
  page: number;
  limit: number;
}
