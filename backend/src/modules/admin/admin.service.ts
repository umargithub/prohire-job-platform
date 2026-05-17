import { AdminRepository } from "./admin.repository";
import { AdminUserRow } from "./admin.types";
import { AdminStatsResponse } from "./admin.response";
import { ListUsersQueryInput } from "./admin.dto";
import { NotFoundError } from "../../core/errors/AppError";

export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async listUsers(
    filters: ListUsersQueryInput,
  ): Promise<{ users: AdminUserRow[]; total: number; page: number; limit: number }> {
    const { users, total } = await this.adminRepository.findAllUsers(filters);
    return { users, total, page: filters.page, limit: filters.limit };
  }

  async deleteUser(userId: string): Promise<void> {
    const deleted = await this.adminRepository.softDeleteUser(userId);
    if (!deleted) throw new NotFoundError("User");
  }

  async deleteCompany(companyId: string): Promise<void> {
    const deleted = await this.adminRepository.softDeleteCompany(companyId);
    if (!deleted) throw new NotFoundError("Company");
  }

  async getStats(): Promise<AdminStatsResponse> {
    return this.adminRepository.getStats();
  }
}
