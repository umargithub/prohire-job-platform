import { z } from "zod";

export const ListJobsQueryDto = z.object({
  title:            z.string().max(200).optional(),
  location:         z.string().max(200).optional(),
  job_type:         z.enum(["remote", "hybrid", "onsite"]).optional(),
  experience_level: z.enum(["junior", "mid", "senior"]).optional(),
  salary_min:       z.coerce.number().positive().optional(),
  page:             z.coerce.number().int().min(1).default(1),
  limit:            z.coerce.number().int().min(1).max(50).default(20),
});

export type ListJobsQueryInput = z.infer<typeof ListJobsQueryDto>;
