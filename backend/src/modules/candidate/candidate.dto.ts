import { z } from "zod";

export const UpsertCandidateProfileDto = z.object({
  full_name:  z.string().min(1).max(100),
  bio:        z.string().max(1000).optional(),
  resume_url: z.string().url().optional(),
});

export type UpsertCandidateProfileInput = z.infer<typeof UpsertCandidateProfileDto>;
