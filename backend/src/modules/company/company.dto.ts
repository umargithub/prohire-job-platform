import { z } from "zod";

export const UpsertCompanyProfileDto = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  website: z.string().url().optional().or(z.literal("")),
  logo_url: z.string().url().optional().or(z.literal("")),
});

export const CreateJobDto = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    location: z.string().max(200).optional(),
    job_type: z.enum(["remote", "hybrid", "onsite"]),
    experience_level: z.enum(["junior", "mid", "senior"]),
    salary_min: z.number().positive().optional(),
    salary_max: z.number().positive().optional(),
  })
  .refine(
    (d) => !d.salary_min || !d.salary_max || d.salary_max >= d.salary_min,
    { message: "salary_max must be >= salary_min", path: ["salary_max"] },
  );

export const UpdateJobDto = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).optional(),
    location: z.string().max(200).optional(),
    job_type: z.enum(["remote", "hybrid", "onsite"]).optional(),
    experience_level: z.enum(["junior", "mid", "senior"]).optional(),
    salary_min: z.number().positive().optional(),
    salary_max: z.number().positive().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (d) => !d.salary_min || !d.salary_max || d.salary_max >= d.salary_min,
    { message: "salary_max must be >= salary_min", path: ["salary_max"] },
  );

export const InviteMemberDto = z.object({
  email: z.string().email(),
});

export const AcceptInviteDto = z.object({
  token: z.string().min(1),
});

export const TransferOwnershipDto = z.object({
  userId: z.string().uuid(),
});

export type UpsertCompanyProfileInput = z.infer<typeof UpsertCompanyProfileDto>;
export type CreateJobInput = z.infer<typeof CreateJobDto>;
export type UpdateJobInput = z.infer<typeof UpdateJobDto>;
export type InviteMemberInput = z.infer<typeof InviteMemberDto>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteDto>;
export type TransferOwnershipInput = z.infer<typeof TransferOwnershipDto>;
