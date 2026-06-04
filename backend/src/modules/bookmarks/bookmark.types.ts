export interface BookmarkRow {
  id: string;
  candidate_id: string;
  job_id: string;
  created_at: Date;
}

export interface BookmarkWithJobRow extends BookmarkRow {
  title: string;
  company_name: string;
  location: string;
  job_type: string;
  status: string;
}
