import { apiClient } from "@/lib/api";
import type {
  ApiSuccessResponse,
  ExperienceLevel,
  JobResponse,
  JobType,
  PaginatedJobs,
} from "@/types/api";

/**
 * Browse filters in the frontend's camelCase vocabulary. `listJobs` maps these
 * to the backend's snake_case query params (`job_type`, `experience_level`,
 * `salary_min`).
 */
export interface JobFilters {
  search?: string;
  location?: string;
  jobType?: JobType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  page?: number;
  limit?: number;
}

export async function listJobs(filters: JobFilters): Promise<PaginatedJobs> {
  const params: Record<string, string | number> = {};
  if (filters.search) params["search"] = filters.search;
  if (filters.location) params["location"] = filters.location;
  if (filters.jobType) params["job_type"] = filters.jobType;
  if (filters.experienceLevel)
    params["experience_level"] = filters.experienceLevel;
  if (filters.salaryMin !== undefined) params["salary_min"] = filters.salaryMin;
  if (filters.page !== undefined) params["page"] = filters.page;
  if (filters.limit !== undefined) params["limit"] = filters.limit;

  const { data } = await apiClient.get<ApiSuccessResponse<PaginatedJobs>>(
    "/jobs",
    { params },
  );
  return data.data;
}

export async function getJob(id: string): Promise<JobResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<JobResponse>>(
    `/jobs/${id}`,
  );
  return data.data;
}
