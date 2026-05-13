import type { JobRow } from "../company/company.types";

export interface FindJobsResult {
  jobs: JobRow[];
  total: number;
}

export interface PaginatedJobs {
  jobs: JobRow[];
  total: number;
  page: number;
  limit: number;
}
