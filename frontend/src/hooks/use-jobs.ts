"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { getJob, listJobs, type JobFilters } from "@/lib/api/jobs";
import { queryKeys } from "@/lib/query-keys";
import type { JobResponse, PaginatedJobs } from "@/types/api";

/** Matches the backend Redis TTL for job data (JOB_LIST / JOB_DETAIL). */
const JOBS_STALE_TIME = 5 * 60 * 1000;

export function useJobs(filters: JobFilters): UseQueryResult<PaginatedJobs> {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters as Record<string, unknown>),
    queryFn: () => listJobs(filters),
    staleTime: JOBS_STALE_TIME,
    // Keep the previous page visible while the next one loads — no flash of
    // empty state during pagination or filter changes.
    placeholderData: keepPreviousData,
  });
}

export function useJob(id: string): UseQueryResult<JobResponse> {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => getJob(id),
    staleTime: JOBS_STALE_TIME,
    enabled: Boolean(id),
  });
}
