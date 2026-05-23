import { PoolClient } from "pg";
import { DatabaseClient } from "../../core/database/db";
import { CompanyRow, CompanyMemberRow, CompanyMemberWithEmailRow, CompanyInviteRow } from "./company.types";
import { JobWithCompanyRow } from "../jobs/jobs.types";
import {
  UpsertCompanyProfileInput,
  CreateJobInput,
  UpdateJobInput,
} from "./company.dto";

export class CompanyRepository {
  constructor(private readonly db: DatabaseClient) {}

  async createCompanyWithOwner(
    ownerId: string,
    input: UpsertCompanyProfileInput,
  ): Promise<CompanyRow> {
    return this.db.transaction(async (tx: PoolClient) => {
      const companyResult = await tx.query<CompanyRow>(
        `INSERT INTO companies (owner_id, name, description, website, logo_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [ownerId, input.name, input.description ?? null, input.website || null, input.logo_url || null],
      );
      const company = companyResult.rows[0]!;
      await tx.query(
        `INSERT INTO company_members (company_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [company.id, ownerId],
      );
      return company;
    });
  }

  async findCompanyByMembership(userId: string): Promise<CompanyRow | null> {
    const result = await this.db.query<CompanyRow>(
      `SELECT c.* FROM companies c
       JOIN company_members cm ON cm.company_id = c.id
       WHERE cm.user_id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async findMembersByCompanyId(companyId: string): Promise<CompanyMemberWithEmailRow[]> {
    const result = await this.db.query<CompanyMemberWithEmailRow>(
      `SELECT cm.*, u.email FROM company_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.company_id = $1
       ORDER BY cm.created_at ASC`,
      [companyId],
    );
    return result.rows;
  }

  async findMemberByUserId(companyId: string, userId: string): Promise<CompanyMemberRow | null> {
    const result = await this.db.query<CompanyMemberRow>(
      `SELECT * FROM company_members WHERE company_id = $1 AND user_id = $2`,
      [companyId, userId],
    );
    return result.rows[0] ?? null;
  }

  async addMember(companyId: string, userId: string): Promise<CompanyMemberWithEmailRow> {
    const result = await this.db.query<CompanyMemberWithEmailRow>(
      `INSERT INTO company_members (company_id, user_id, role)
       VALUES ($1, $2, 'recruiter')
       RETURNING *, (SELECT email FROM users WHERE id = $2) AS email`,
      [companyId, userId],
    );
    return result.rows[0]!;
  }

  async removeMember(companyId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM company_members WHERE company_id = $1 AND user_id = $2 AND role = 'recruiter'`,
      [companyId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findUserByEmail(email: string): Promise<{ id: string; role: string } | null> {
    const result = await this.db.query<{ id: string; role: string }>(
      `SELECT id, role FROM users WHERE email = $1`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async createInvite(
    companyId: string,
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<CompanyInviteRow> {
    const result = await this.db.query<CompanyInviteRow>(
      `INSERT INTO company_invites (company_id, email, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [companyId, email, tokenHash, expiresAt],
    );
    return result.rows[0]!;
  }

  async findInviteByTokenHash(tokenHash: string): Promise<CompanyInviteRow | null> {
    const result = await this.db.query<CompanyInviteRow>(
      `SELECT * FROM company_invites WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async findInviteByEmail(companyId: string, email: string): Promise<CompanyInviteRow | null> {
    const result = await this.db.query<CompanyInviteRow>(
      `SELECT * FROM company_invites WHERE company_id = $1 AND email = $2`,
      [companyId, email],
    );
    return result.rows[0] ?? null;
  }

  async deleteInvite(id: string): Promise<void> {
    await this.db.query(`DELETE FROM company_invites WHERE id = $1`, [id]);
  }

  async acceptInvite(inviteId: string, companyId: string, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.query(
        `INSERT INTO company_members (company_id, user_id, role) VALUES ($1, $2, 'recruiter')`,
        [companyId, userId],
      );
      await tx.query(`DELETE FROM company_invites WHERE id = $1`, [inviteId]);
    });
  }

  async transferOwnership(
    companyId: string,
    currentOwnerUserId: string,
    newOwnerUserId: string,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await tx.query(
        `UPDATE company_members SET role = 'recruiter'
         WHERE company_id = $1 AND user_id = $2 AND role = 'owner'`,
        [companyId, currentOwnerUserId],
      );
      const promote = await tx.query(
        `UPDATE company_members SET role = 'owner'
         WHERE company_id = $1 AND user_id = $2 AND role = 'recruiter'`,
        [companyId, newOwnerUserId],
      );
      if ((promote.rowCount ?? 0) === 0) return false;
      await tx.query(
        `UPDATE companies SET owner_id = $1, updated_at = NOW() WHERE id = $2`,
        [newOwnerUserId, companyId],
      );
      return true;
    });
  }

  async updateCompany(
    ownerId: string,
    input: UpsertCompanyProfileInput,
  ): Promise<CompanyRow | null> {
    const result = await this.db.query<CompanyRow>(
      `UPDATE companies
       SET name = $1, description = $2, website = $3, logo_url = $4, updated_at = NOW()
       WHERE owner_id = $5
       RETURNING *`,
      [
        input.name,
        input.description ?? null,
        input.website || null,
        input.logo_url || null,
        ownerId,
      ],
    );
    return result.rows[0] ?? null;
  }

  async updateLogoUrl(
    ownerId: string,
    logoUrl: string,
  ): Promise<CompanyRow | null> {
    const result = await this.db.query<CompanyRow>(
      `UPDATE companies
       SET logo_url = $1, updated_at = NOW()
       WHERE owner_id = $2
       RETURNING *`,
      [logoUrl, ownerId],
    );
    return result.rows[0] ?? null;
  }

  async createJob(companyId: string, input: CreateJobInput): Promise<JobWithCompanyRow> {
    const result = await this.db.query<JobWithCompanyRow>(
      `WITH inserted AS (
         INSERT INTO jobs (company_id, title, description, location, job_type, experience_level, salary_min, salary_max)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *
       )
       SELECT j.*, c.name AS company_name, c.logo_url AS company_logo_url
       FROM inserted j
       JOIN companies c ON c.id = j.company_id`,
      [
        companyId,
        input.title,
        input.description,
        input.location ?? null,
        input.job_type,
        input.experience_level,
        input.salary_min ?? null,
        input.salary_max ?? null,
      ],
    );
    return result.rows[0]!;
  }

  async findJobsByCompanyId(companyId: string): Promise<JobWithCompanyRow[]> {
    const result = await this.db.query<JobWithCompanyRow>(
      `SELECT j.*, c.name AS company_name, c.logo_url AS company_logo_url
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE j.company_id = $1
       ORDER BY j.created_at DESC`,
      [companyId],
    );
    return result.rows;
  }

  async findJobById(id: string, companyId: string): Promise<JobWithCompanyRow | null> {
    const result = await this.db.query<JobWithCompanyRow>(
      `SELECT j.*, c.name AS company_name, c.logo_url AS company_logo_url
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE j.id = $1 AND j.company_id = $2`,
      [id, companyId],
    );
    return result.rows[0] ?? null;
  }

  async updateJob(
    id: string,
    companyId: string,
    input: UpdateJobInput,
  ): Promise<JobWithCompanyRow | null> {
    const result = await this.db.query<JobWithCompanyRow>(
      `WITH updated AS (
         UPDATE jobs
         SET
           title            = COALESCE($1, title),
           description      = COALESCE($2, description),
           location         = COALESCE($3, location),
           job_type         = COALESCE($4, job_type),
           experience_level = COALESCE($5, experience_level),
           salary_min       = COALESCE($6, salary_min),
           salary_max       = COALESCE($7, salary_max),
           is_active        = COALESCE($8, is_active),
           updated_at       = NOW()
         WHERE id = $9 AND company_id = $10
         RETURNING *
       )
       SELECT j.*, c.name AS company_name, c.logo_url AS company_logo_url
       FROM updated j
       JOIN companies c ON c.id = j.company_id`,
      [
        input.title ?? null,
        input.description ?? null,
        input.location ?? null,
        input.job_type ?? null,
        input.experience_level ?? null,
        input.salary_min ?? null,
        input.salary_max ?? null,
        input.is_active ?? null,
        id,
        companyId,
      ],
    );
    return result.rows[0] ?? null;
  }

  async deactivateJob(id: string, companyId: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE jobs SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
