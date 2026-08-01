"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  getApplicationDetail,
  getJobApplications,
  updateApplicationStage,
  type UpdateStageInput,
} from "@/lib/api/applications";
import { queryKeys } from "@/lib/query-keys";
import type {
  ApplicationDetailResponse,
  ApplicationResponse,
  CompanyApplicationResponse,
  PaginatedApplications,
} from "@/types/api";

const APPLICATIONS_STALE_TIME = 30_000;

export function useJobApplications(
  jobId: string,
  page: number,
): UseQueryResult<PaginatedApplications<CompanyApplicationResponse>> {
  return useQuery({
    queryKey: queryKeys.company.applications(jobId, page),
    queryFn: () => getJobApplications(jobId, page),
    enabled: Boolean(jobId),
    staleTime: APPLICATIONS_STALE_TIME,
  });
}

export function useApplicationDetail(
  id: string,
): UseQueryResult<ApplicationDetailResponse> {
  return useQuery({
    queryKey: queryKeys.company.applicationDetail(id),
    queryFn: () => getApplicationDetail(id),
    enabled: Boolean(id),
    staleTime: APPLICATIONS_STALE_TIME,
  });
}

export function useUpdateApplicationStage(
  jobId: string,
  page: number,
): ReturnType<
  typeof useMutation<
    ApplicationResponse,
    unknown,
    { id: string; input: UpdateStageInput }
  >
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updateApplicationStage(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.company.applications(jobId, page),
      });
    },
  });
}
