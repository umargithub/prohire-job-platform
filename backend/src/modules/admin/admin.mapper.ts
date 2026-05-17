import { AdminUserRow } from "./admin.types";
import { AdminUserResponse } from "./admin.response";

export function toAdminUserResponse(row: AdminUserRow): AdminUserResponse {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isVerified: row.is_verified,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
