export interface CandidateProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  bio: string | null;
  resume_url: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}
