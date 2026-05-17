import { DatabaseClient } from "../../core/database/db";
import {
  AdminUserRow,
  AdminCompanyRow,
  UserStatsRow,
  JobStatsRow,
  CompanyStatsRow,
  ApplicationStageRow,
} from "./admin.types";
import { AdminStatsResponse } from "./admin.response";
import { ListUsersQueryInput } from "./admin.dto";

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

  async getStats(): Promise<AdminStatsResponse> {
    const [userStats, jobStats, companyStats, applicationStages] =
      await Promise.all([
        this.db.query<UserStatsRow>(
          `SELECT
             COUNT(*)                                    AS total,
             COUNT(*) FILTER (WHERE role = 'candidate') AS candidates,
             COUNT(*) FILTER (WHERE role = 'company')   AS companies,
             COUNT(*) FILTER (WHERE role = 'admin')     AS admins,
             COUNT(*) FILTER (WHERE is_verified = TRUE) AS verified,
             COUNT(*) FILTER (WHERE is_deleted = TRUE)  AS deleted
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
