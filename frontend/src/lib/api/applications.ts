import { apiClient } from "@/lib/api";
import type {
  ApiSuccessResponse,
  ApplicationDetailResponse,
  ApplicationResponse,
  ApplicationStage,
  CandidateApplicationResponse,
  CompanyApplicationResponse,
  PaginatedApplications,
} from "@/types/api";

// ── Candidate ─────────────────────────────────────────────────────────────

export interface ApplyToJobInput {
  jobId: string;
  coverLetter?: string;
}

export async function applyToJob(
  input: ApplyToJobInput,
): Promise<ApplicationResponse> {
  const { data } = await apiClient.post<
    ApiSuccessResponse<ApplicationResponse>
  >("/applications", {
    job_id: input.jobId,
    ...(input.coverLetter ? { cover_letter: input.coverLetter } : {}),
  });
  return data.data;
}

export async function getMyApplications(
  page: number,
): Promise<PaginatedApplications<CandidateApplicationResponse>> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<PaginatedApplications<CandidateApplicationResponse>>
  >("/applications", { params: { page } });
  return data.data;
}

// ── Company ───────────────────────────────────────────────────────────────

export async function getJobApplications(
  jobId: string,
  page: number,
): Promise<PaginatedApplications<CompanyApplicationResponse>> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<PaginatedApplications<CompanyApplicationResponse>>
  >(`/jobs/${jobId}/applications`, { params: { page } });
  return data.data;
}

export async function getApplicationDetail(
  id: string,
): Promise<ApplicationDetailResponse> {
  const { data } = await apiClient.get<
    ApiSuccessResponse<ApplicationDetailResponse>
  >(`/applications/${id}`);
  return data.data;
}

export interface UpdateStageInput {
  stage: ApplicationStage;
  version: number;
}

export async function updateApplicationStage(
  id: string,
  input: UpdateStageInput,
): Promise<ApplicationResponse> {
  const { data } = await apiClient.patch<
    ApiSuccessResponse<ApplicationResponse>
  >(`/applications/${id}/stage`, input);
  return data.data;
}
