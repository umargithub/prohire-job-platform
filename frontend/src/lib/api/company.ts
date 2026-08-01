import { apiClient } from "@/lib/api";
import type {
  ApiSuccessResponse,
  CompanyJobsResponse,
  ExperienceLevel,
  JobResponse,
  JobType,
} from "@/types/api";

export interface UpsertCompanyJobInput {
  title: string;
  description: string;
  location?: string;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  isActive?: boolean;
}

function toRequestBody(
  input: Partial<UpsertCompanyJobInput>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.title !== undefined) body["title"] = input.title;
  if (input.description !== undefined) body["description"] = input.description;
  if (input.location !== undefined) body["location"] = input.location;
  if (input.jobType !== undefined) body["job_type"] = input.jobType;
  if (input.experienceLevel !== undefined)
    body["experience_level"] = input.experienceLevel;
  if (input.salaryMin !== undefined) body["salary_min"] = input.salaryMin;
  if (input.salaryMax !== undefined) body["salary_max"] = input.salaryMax;
  if (input.isActive !== undefined) body["is_active"] = input.isActive;
  return body;
}

export async function listCompanyJobs(): Promise<CompanyJobsResponse> {
  const { data } =
    await apiClient.get<ApiSuccessResponse<CompanyJobsResponse>>(
      "/company/jobs",
    );
  return data.data;
}

export async function getCompanyJob(id: string): Promise<JobResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<JobResponse>>(
    `/company/jobs/${id}`,
  );
  return data.data;
}

export async function createCompanyJob(
  input: UpsertCompanyJobInput,
): Promise<JobResponse> {
  const { data } = await apiClient.post<ApiSuccessResponse<JobResponse>>(
    "/company/jobs",
    toRequestBody(input),
  );
  return data.data;
}

export async function updateCompanyJob(
  id: string,
  input: Partial<UpsertCompanyJobInput>,
): Promise<JobResponse> {
  const { data } = await apiClient.patch<ApiSuccessResponse<JobResponse>>(
    `/company/jobs/${id}`,
    toRequestBody(input),
  );
  return data.data;
}

export async function deleteCompanyJob(id: string): Promise<void> {
  await apiClient.delete(`/company/jobs/${id}`);
}
