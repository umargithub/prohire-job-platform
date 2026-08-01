import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  getCandidateProfile,
  createCandidateProfile,
  updateCandidateProfile,
  uploadCandidateAvatar,
  uploadCandidateResume,
  type UpsertCandidateProfileInput,
} from "@/lib/api/candidate";
import { queryKeys } from "@/lib/query-keys";
import type { CandidateProfileResponse } from "@/types/api";

export function useCandidateProfile(): ReturnType<
  typeof useQuery<CandidateProfileResponse, unknown>
> & { profileMissing: boolean } {
  const query = useQuery({
    queryKey: queryKeys.candidate.profile(),
    queryFn: getCandidateProfile,
    retry: false,
  });

  const profileMissing =
    axios.isAxiosError(query.error) && query.error.response?.status === 404;

  return { ...query, profileMissing };
}

export function useSaveCandidateProfile(
  mode: "create" | "update",
): ReturnType<
  typeof useMutation<
    CandidateProfileResponse,
    unknown,
    UpsertCandidateProfileInput
  >
> {
  const queryClient = useQueryClient();
  const save =
    mode === "create" ? createCandidateProfile : updateCandidateProfile;

  return useMutation({
    mutationFn: save,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.candidate.profile(), profile);
    },
  });
}

export function useUploadCandidateAvatar(): ReturnType<
  typeof useMutation<CandidateProfileResponse, unknown, File>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadCandidateAvatar,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.candidate.profile(), profile);
    },
  });
}

export function useUploadCandidateResume(): ReturnType<
  typeof useMutation<CandidateProfileResponse, unknown, File>
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadCandidateResume,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.candidate.profile(), profile);
    },
  });
}
