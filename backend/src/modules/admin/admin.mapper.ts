import { AdminUserRow, AdminCompanyRow, AdminJobRow } from "./admin.types";
import { AdminUserResponse, AdminCompanyResponse, AdminJobResponse } from "./admin.response";

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

export function toAdminCompanyResponse(row: AdminCompanyRow): AdminCompanyResponse {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    ownerEmail: row.owner_email,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
  };
}

export function toAdminJobResponse(row: AdminJobRow): AdminJobResponse {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    title: row.title,
    location: row.location,
    jobType: row.job_type,
    experienceLevel: row.experience_level,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
