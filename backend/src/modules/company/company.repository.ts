import { DatabaseClient } from "../../core/database/db";
import { CompanyRow, JobRow } from "./company.types";
import {
  UpsertCompanyProfileInput,
  CreateJobInput,
  UpdateJobInput,
} from "./company.dto";

export class CompanyRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findCompanyByOwnerId(ownerId: string): Promise<CompanyRow | null> {
    const result = await this.db.query<CompanyRow>(
      "SELECT * FROM companies WHERE owner_id = $1",
      [ownerId],
    );
    return result.rows[0] ?? null;
  }

  async createCompany(
    ownerId: string,
    input: UpsertCompanyProfileInput,
  ): Promise<CompanyRow> {
    const result = await this.db.query<CompanyRow>(
      `INSERT INTO companies (owner_id, name, description, website, logo_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        ownerId,
        input.name,
        input.description ?? null,
        input.website || null,
        input.logo_url || null,
      ],
    );
    return result.rows[0]!;
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

  async createJob(companyId: string, input: CreateJobInput): Promise<JobRow> {
    const result = await this.db.query<JobRow>(
      `INSERT INTO jobs (company_id, title, description, location, job_type, experience_level, salary_min, salary_max)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
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

  async findJobsByCompanyId(companyId: string): Promise<JobRow[]> {
    const result = await this.db.query<JobRow>(
      "SELECT * FROM jobs WHERE company_id = $1 ORDER BY created_at DESC",
      [companyId],
    );
    return result.rows;
  }

  async findJobById(id: string, companyId: string): Promise<JobRow | null> {
    const result = await this.db.query<JobRow>(
      "SELECT * FROM jobs WHERE id = $1 AND company_id = $2",
      [id, companyId],
    );
    return result.rows[0] ?? null;
  }

  async updateJob(
    id: string,
    companyId: string,
    input: UpdateJobInput,
  ): Promise<JobRow | null> {
    const result = await this.db.query<JobRow>(
      `UPDATE jobs
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
       RETURNING *`,
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
