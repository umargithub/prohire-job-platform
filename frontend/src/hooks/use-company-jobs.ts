"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCompanyJob,
  deleteCompanyJob,
  getCompanyJob,
  listCompanyJobs,
  updateCompanyJob,
  type UpsertCompanyJobInput,
} from "@/lib/api/company";
import { queryKeys } from "@/lib/query-keys";
import type { CompanyJobsResponse, JobResponse } from "@/types/api";
import type { UseQueryResult } from "@tanstack/react-query";

export function useCompanyJobs(): UseQueryResult<CompanyJobsResponse> {
  return useQuery({
    queryKey: queryKeys.company.jobs(),
    queryFn: listCompanyJobs,
  });
}

export function useCompanyJob(id: string): UseQueryResult<JobResponse> {
  return useQuery({
    queryKey: queryKeys.company.job(id),
    queryFn: () => getCompanyJob(id),
    enabled: Boolean(id),
  });
}

export function useCreateCompanyJob(): ReturnType<
  typeof useMutation<JobResponse, unknown, UpsertCompanyJobInput>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompanyJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.jobs() });
    },
  });
}

export function useUpdateCompanyJob(
  id: string,
): ReturnType<
  typeof useMutation<JobResponse, unknown, Partial<UpsertCompanyJobInput>>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<UpsertCompanyJobInput>) =>
      updateCompanyJob(id, input),
    onSuccess: (job) => {
      queryClient.setQueryData(queryKeys.company.job(id), job);
      queryClient.invalidateQueries({ queryKey: queryKeys.company.jobs() });
    },
  });
}

export function useDeleteCompanyJob(): ReturnType<
  typeof useMutation<void, unknown, string>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCompanyJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.jobs() });
    },
  });
}
