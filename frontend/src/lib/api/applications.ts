import { apiClient } from "@/lib/api";
import type {
  ApiSuccessResponse,
  ApplicationDetailResponse,
  ApplicationResponse,
  ApplicationStage,
  CompanyApplicationResponse,
  PaginatedApplications,
} from "@/types/api";

/** Stages a company can move an application to. Excludes "applied" — that's
 * the initial state set by the candidate, never a manual target. */
export const NEXT_STAGES: ReadonlyArray<ApplicationStage> = [
  "reviewed",
  "interview",
  "offered",
  "rejected",
];

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
