import { z } from "zod";
import { APPLICATION_STAGES } from "./application.types";

export const ApplyToJobDto = z.object({
  job_id: z.string().uuid(),
  cover_letter: z.string().max(2000).optional(),
});

export const UpdateStageDto = z.object({
  stage: z.enum(APPLICATION_STAGES),
  version: z.number().int().positive(),
});

export const GetApplicationsQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ApplyToJobInput = z.infer<typeof ApplyToJobDto>;
export type UpdateStageInput = z.infer<typeof UpdateStageDto>;
export type GetApplicationsQueryInput = z.infer<typeof GetApplicationsQueryDto>;
