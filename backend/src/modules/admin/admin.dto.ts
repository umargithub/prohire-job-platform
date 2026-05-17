import { z } from "zod";

export const ListUsersQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(["candidate", "company", "admin"]).optional(),
  is_deleted: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export type ListUsersQueryInput = z.infer<typeof ListUsersQueryDto>;
