import { CompanyRow, JobRow } from "./company.types";
import { CompanyResponse, JobResponse } from "./company.response";

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
