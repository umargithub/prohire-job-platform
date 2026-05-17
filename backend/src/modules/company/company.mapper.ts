import { CompanyRow, CompanyMemberWithEmailRow } from "./company.types";
import { CompanyResponse, CompanyMemberResponse } from "./company.response";

export function toCompanyMemberResponse(row: CompanyMemberWithEmailRow): CompanyMemberResponse {
  return {
    id: row.id,
    role: row.role,
    createdAt: row.created_at,
    user: {
      id: row.user_id,
      email: row.email,
    },
  };
}

export function toCompanyResponse(row: CompanyRow): CompanyResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    website: row.website,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
