import { apiClient } from "@/lib/api";
import type { ApiSuccessResponse, CandidateProfileResponse } from "@/types/api";

export interface UpsertCandidateProfileInput {
  fullName: string;
  bio?: string;
  resumeUrl?: string;
  avatarUrl?: string;
}

function toRequestBody(
  input: UpsertCandidateProfileInput,
): Record<string, string> {
  const body: Record<string, string> = { full_name: input.fullName };
  if (input.bio) body["bio"] = input.bio;
  if (input.resumeUrl) body["resume_url"] = input.resumeUrl;
  if (input.avatarUrl) body["avatar_url"] = input.avatarUrl;
  return body;
}

export async function getCandidateProfile(): Promise<CandidateProfileResponse> {
  const { data } =
    await apiClient.get<ApiSuccessResponse<CandidateProfileResponse>>(
      "/candidate/profile",
    );
  return data.data;
}

export async function createCandidateProfile(
  input: UpsertCandidateProfileInput,
): Promise<CandidateProfileResponse> {
  const { data } = await apiClient.post<
    ApiSuccessResponse<CandidateProfileResponse>
  >("/candidate/profile", toRequestBody(input));
  return data.data;
}

export async function updateCandidateProfile(
  input: UpsertCandidateProfileInput,
): Promise<CandidateProfileResponse> {
  const { data } = await apiClient.put<
    ApiSuccessResponse<CandidateProfileResponse>
  >("/candidate/profile", toRequestBody(input));
  return data.data;
}

export async function uploadCandidateAvatar(
  file: File,
): Promise<CandidateProfileResponse> {
  const form = new FormData();
  form.append("avatar", file);
  const { data } = await apiClient.patch<
    ApiSuccessResponse<CandidateProfileResponse>
  >("/candidate/profile/avatar", form);
  return data.data;
}

export async function uploadCandidateResume(
  file: File,
): Promise<CandidateProfileResponse> {
  const form = new FormData();
  form.append("resume", file);
  const { data } = await apiClient.patch<
    ApiSuccessResponse<CandidateProfileResponse>
  >("/candidate/profile/resume", form);
  return data.data;
}
