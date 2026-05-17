import { CandidateProfileRow } from "./candidate.types";
import { CandidateProfileResponse } from "./candidate.response";

export function toCandidateProfileResponse(row: CandidateProfileRow): CandidateProfileResponse {
  return {
    id: row.id,
    fullName: row.full_name,
    bio: row.bio,
    resumeUrl: row.resume_url,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
