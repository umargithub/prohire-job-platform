export type { JobRow, JobResponse } from "../company/company.types";

export interface PaginatedJobs {
  jobs: import("../company/company.types").JobRow[];
  total: number;
  page: number;
  limit: number;
}
