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

export interface CompanyResponse {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobResponse {
  id: string;
  companyId: string;
  title: string;
  description: string;
  location: string | null;
  jobType: "remote" | "hybrid" | "onsite";
  experienceLevel: "junior" | "mid" | "senior";
  salaryMin: number | null;
  salaryMax: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toCompanyResponse(row: CompanyRow): CompanyResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    website: row.website,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toJobResponse(row: JobRow): JobResponse {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    description: row.description,
    location: row.location,
    jobType: row.job_type,
    experienceLevel: row.experience_level,
    salaryMin: row.salary_min !== null ? parseFloat(row.salary_min) : null,
    salaryMax: row.salary_max !== null ? parseFloat(row.salary_max) : null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
