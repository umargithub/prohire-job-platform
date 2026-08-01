"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  applyToJob,
  getMyApplications,
  type ApplyToJobInput,
} from "@/lib/api/applications";
import { queryKeys } from "@/lib/query-keys";
import type {
  ApplicationResponse,
  CandidateApplicationResponse,
  PaginatedApplications,
} from "@/types/api";

const APPLICATIONS_STALE_TIME = 30_000;

export function useMyApplications(
  page: number,
): UseQueryResult<PaginatedApplications<CandidateApplicationResponse>> {
  return useQuery({
    queryKey: queryKeys.candidate.applications(page),
    queryFn: () => getMyApplications(page),
    staleTime: APPLICATIONS_STALE_TIME,
  });
}

export function useApplyToJob(): ReturnType<
  typeof useMutation<ApplicationResponse, unknown, ApplyToJobInput>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyToJob,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["candidate", "applications"],
      });
    },
  });
}
