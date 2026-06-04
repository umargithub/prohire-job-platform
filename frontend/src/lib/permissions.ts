import type { UserRole } from '@/types/api';

export const ADMIN_ROLES = ['admin', 'super_admin', 'moderator'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: UserRole): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}
