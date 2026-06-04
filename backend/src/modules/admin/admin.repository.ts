import { DatabaseClient } from "../../core/database/db";
import {
  AdminUserRow,
  AdminCompanyRow,
  AdminJobRow,
  UserStatsRow,
  JobStatsRow,
  CompanyStatsRow,
  ApplicationStageRow,
} from "./admin.types";
import { AdminStatsResponse } from "./admin.response";
import {
  ListUsersQueryInput,
  ListCompaniesQueryInput,
  ListJobsQueryInput,
} from "./admin.dto";

export class AdminRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findAllUsers(
    filters: ListUsersQueryInput,
  ): Promise<{ users: AdminUserRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.role !== undefined) {
      params.push(filters.role);
      conditions.push(`role = $${params.length}`);
    }
    if (filters.is_deleted !== undefined) {
      params.push(filters.is_deleted);
      conditions.push(`is_deleted = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`email ILIKE $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM users ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0]!.count, 10);

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const dataResult = await this.db.query<AdminUserRow>(
      `SELECT id, email, role, is_verified, is_deleted, created_at, updated_at
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    return { users: dataResult.rows, total };
  }

  async isCompanyOwner(userId: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM company_members
         WHERE user_id = $1 AND role = 'owner'
       ) AS exists`,
      [userId],
    );
    return result.rows[0]!.exists;
  }

  async softDeleteUser(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE users SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 AND is_deleted = FALSE`,
      [userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async softDeleteCompany(companyId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE companies SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 AND is_deleted = FALSE`,
      [companyId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findAllCompanies(
    filters: ListCompaniesQueryInput,
  ): Promise<{ companies: AdminCompanyRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`c.name ILIKE $${params.length}`);
    }
    if (filters.is_deleted !== undefined) {
      params.push(filters.is_deleted);
      conditions.push(`c.is_deleted = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM companies c ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0]!.count, 10);

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const dataResult = await this.db.query<AdminCompanyRow>(
      `SELECT c.id, c.owner_id, u.email AS owner_email, c.name, c.is_deleted, c.created_at
       FROM companies c
       JOIN users u ON u.id = c.owner_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    return { companies: dataResult.rows, total };
  }

  async findAllJobs(
    filters: ListJobsQueryInput,
  ): Promise<{ jobs: AdminJobRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`j.title ILIKE $${params.length}`);
    }
    if (filters.is_active !== undefined) {
      params.push(filters.is_active);
      conditions.push(`j.is_active = $${params.length}`);
    }
    if (filters.company_id) {
      params.push(filters.company_id);
      conditions.push(`j.company_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM jobs j ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0]!.count, 10);

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const dataResult = await this.db.query<AdminJobRow>(
      `SELECT j.id, j.company_id, c.name AS company_name, j.title, j.location,
              j.job_type, j.experience_level, j.is_active, j.created_at, j.updated_at
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       ${where}
       ORDER BY j.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    return { jobs: dataResult.rows, total };
  }

  async deactivateJob(jobId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE jobs SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND is_active = TRUE`,
      [jobId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async verifyUser(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE users SET is_verified = TRUE, updated_at = NOW()
       WHERE id = $1 AND is_verified = FALSE`,
      [userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async createAdminUser(input: {
    email: string;
    passwordHash: string;
    role: "admin" | "super_admin" | "moderator";
  }): Promise<AdminUserRow> {
    const result = await this.db.query<AdminUserRow>(
      `INSERT INTO users (email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, email, role, is_verified, is_deleted, created_at, updated_at`,
      [input.email, input.passwordHash, input.role],
    );
    return result.rows[0]!;
  }

  async getStats(): Promise<AdminStatsResponse> {
    const [userStats, jobStats, companyStats, applicationStages] =
      await Promise.all([
        this.db.query<UserStatsRow>(
          `SELECT
             COUNT(*)                                          AS total,
             COUNT(*) FILTER (WHERE role = 'candidate')       AS candidates,
             COUNT(*) FILTER (WHERE role = 'company')         AS companies,
             COUNT(*) FILTER (WHERE role = 'admin')           AS admins,
             COUNT(*) FILTER (WHERE role = 'super_admin')     AS super_admins,
             COUNT(*) FILTER (WHERE role = 'moderator')       AS moderators,
             COUNT(*) FILTER (WHERE is_verified = TRUE)       AS verified,
             COUNT(*) FILTER (WHERE is_deleted = TRUE)        AS deleted
           FROM users`,
        ),
        this.db.query<JobStatsRow>(
          `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active = TRUE) AS active FROM jobs`,
        ),
        this.db.query<CompanyStatsRow>(
          `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_deleted = FALSE) AS active FROM companies`,
        ),
        this.db.query<ApplicationStageRow>(
          `SELECT stage, COUNT(*) AS count FROM applications GROUP BY stage`,
        ),
      ]);

    const u = userStats.rows[0]!;
    const j = jobStats.rows[0]!;
    const c = companyStats.rows[0]!;

    const byStage: Record<string, number> = {};
    let totalApplications = 0;
    for (const row of applicationStages.rows) {
      const count = parseInt(row.count, 10);
      byStage[row.stage] = count;
      totalApplications += count;
    }

    return {
      users: {
        total: parseInt(u.total, 10),
        byRole: {
          candidate: parseInt(u.candidates, 10),
          company: parseInt(u.companies, 10),
          admin: parseInt(u.admins, 10),
          super_admin: parseInt(u.super_admins, 10),
          moderator: parseInt(u.moderators, 10),
        },
        verified: parseInt(u.verified, 10),
        deleted: parseInt(u.deleted, 10),
      },
      jobs: {
        total: parseInt(j.total, 10),
        active: parseInt(j.active, 10),
      },
      applications: {
        total: totalApplications,
        byStage,
      },
      companies: {
        total: parseInt(c.total, 10),
        active: parseInt(c.active, 10),
      },
    };
  }
}
