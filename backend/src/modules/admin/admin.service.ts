import bcrypt from "bcrypt";
import { AdminRepository } from "./admin.repository";
import { AdminUserRow, AdminCompanyRow, AdminJobRow } from "./admin.types";
import { AdminStatsResponse } from "./admin.response";
import {
  ListUsersQueryInput,
  ListCompaniesQueryInput,
  ListJobsQueryInput,
  CreateAdminUserInput,
} from "./admin.dto";
import { NotFoundError, ConflictError } from "../../core/errors/AppError";

const BCRYPT_ROUNDS = 12;

export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async listUsers(
    filters: ListUsersQueryInput,
  ): Promise<{ users: AdminUserRow[]; total: number; page: number; limit: number }> {
    const { users, total } = await this.adminRepository.findAllUsers(filters);
    return { users, total, page: filters.page, limit: filters.limit };
  }

  async deleteUser(userId: string): Promise<void> {
    const isOwner = await this.adminRepository.isCompanyOwner(userId);
    if (isOwner)
      throw new ConflictError(
        "User is a company owner. Transfer ownership or delete the company first.",
      );

    const deleted = await this.adminRepository.softDeleteUser(userId);
    if (!deleted) throw new NotFoundError("User");
  }

  async deleteCompany(companyId: string): Promise<void> {
    const deleted = await this.adminRepository.softDeleteCompany(companyId);
    if (!deleted) throw new NotFoundError("Company");
  }

  async listCompanies(
    filters: ListCompaniesQueryInput,
  ): Promise<{ companies: AdminCompanyRow[]; total: number; page: number; limit: number }> {
    const { companies, total } = await this.adminRepository.findAllCompanies(filters);
    return { companies, total, page: filters.page, limit: filters.limit };
  }

  async listJobs(
    filters: ListJobsQueryInput,
  ): Promise<{ jobs: AdminJobRow[]; total: number; page: number; limit: number }> {
    const { jobs, total } = await this.adminRepository.findAllJobs(filters);
    return { jobs, total, page: filters.page, limit: filters.limit };
  }

  async deactivateJob(jobId: string): Promise<void> {
    const deactivated = await this.adminRepository.deactivateJob(jobId);
    if (!deactivated) throw new NotFoundError("Job");
  }

  async verifyUser(userId: string): Promise<void> {
    const verified = await this.adminRepository.verifyUser(userId);
    if (!verified) throw new NotFoundError("User");
  }

  async createAdminUser(input: CreateAdminUserInput): Promise<AdminUserRow> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    try {
      return await this.adminRepository.createAdminUser({
        email: input.email,
        passwordHash,
        role: input.role,
      });
    } catch (err: unknown) {
      if (isUniqueConstraintError(err)) {
        throw new ConflictError("An account with this email already exists.");
      }
      throw err;
    }
  }

  async getStats(): Promise<AdminStatsResponse> {
    return this.adminRepository.getStats();
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}
