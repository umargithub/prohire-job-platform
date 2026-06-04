import { BookmarkWithJobRow } from "./bookmark.types";
import { BookmarkResponse } from "./bookmark.response";

export function toBookmarkResponse(row: BookmarkWithJobRow): BookmarkResponse {
  return {
    id: row.id,
    jobId: row.job_id,
    title: row.title,
    companyName: row.company_name,
    location: row.location,
    jobType: row.job_type,
    status: row.status,
    createdAt: row.created_at,
  };
}
