import { JobWithCompanyRow } from "./jobs.types";
import { JobResponse } from "./jobs.response";

export function toJobResponse(row: JobWithCompanyRow): JobResponse {
  return {
    id: row.id,
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
    company: {
      id: row.company_id,
      name: row.company_name,
      logoUrl: row.company_logo_url,
    },
  };
}
