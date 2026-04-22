export interface CandidateProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  bio: string | null;
  resume_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CandidateProfileResponse {
  id: string;
  fullName: string;
  bio: string | null;
  resumeUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toCandidateProfileResponse(row: CandidateProfileRow): CandidateProfileResponse {
  return {
    id: row.id,
    fullName: row.full_name,
    bio: row.bio,
    resumeUrl: row.resume_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
