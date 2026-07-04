import type { UserRole } from "@/types/api";

export const ADMIN_ROLES = ["admin", "super_admin", "moderator"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: UserRole): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  candidate: "/candidate/profile",
  company: "/company/jobs",
  admin: "/admin",
  super_admin: "/admin",
  moderator: "/admin",
};
