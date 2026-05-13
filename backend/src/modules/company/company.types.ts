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
