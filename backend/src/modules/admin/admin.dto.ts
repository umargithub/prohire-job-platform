import { z } from "zod";

export const ListUsersQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z
    .enum(["candidate", "company", "admin", "super_admin", "moderator"])
    .optional(),
  is_deleted: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const ListCompaniesQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  is_deleted: z.coerce.boolean().optional(),
});

export const ListJobsQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  is_active: z.coerce.boolean().optional(),
  company_id: z.string().uuid().optional(),
});

export const CreateAdminUserDto = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "super_admin", "moderator"]),
});

export type ListUsersQueryInput = z.infer<typeof ListUsersQueryDto>;
export type ListCompaniesQueryInput = z.infer<typeof ListCompaniesQueryDto>;
export type ListJobsQueryInput = z.infer<typeof ListJobsQueryDto>;
export type CreateAdminUserInput = z.infer<typeof CreateAdminUserDto>;
