export interface CandidateProfileResponse {
  id: string;
  fullName: string;
  bio: string | null;
  resumeUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
