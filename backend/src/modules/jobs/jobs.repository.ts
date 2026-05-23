import { DatabaseClient } from "../../core/database/db";
import type { JobWithCompanyRow } from "./jobs.types";
import { ListJobsQueryInput } from "./jobs.dto";
import { FindJobsResult } from "./jobs.types";

export class JobsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findActiveJobs(filters: ListJobsQueryInput): Promise<FindJobsResult> {
    const conditions: string[] = ["is_active = TRUE"];
    const params: unknown[] = [];

    if (filters.search) {
      params.push(filters.search);
      conditions.push(`search_vector @@ websearch_to_tsquery('english', $${params.length})`);
    }
    if (filters.location) {
      params.push(`%${filters.location}%`);
      conditions.push(`location ILIKE $${params.length}`);
    }
    if (filters.job_type) {
      params.push(filters.job_type);
      conditions.push(`job_type = $${params.length}`);
    }
    if (filters.experience_level) {
      params.push(filters.experience_level);
      conditions.push(`experience_level = $${params.length}`);
    }
    if (filters.salary_min !== undefined) {
      params.push(filters.salary_min);
      conditions.push(`salary_max >= $${params.length}`);
    }

    const where = conditions.join(" AND ");

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM jobs WHERE ${where}`,
      params,
    );
    const total = parseInt(countResult.rows[0]!.count, 10);

    const offset = (filters.page - 1) * filters.limit;
    params.push(filters.limit);
    const limitParam = params.length;
    params.push(offset);
    const offsetParam = params.length;

    const dataResult = await this.db.query<JobWithCompanyRow>(
      `SELECT j.*, c.name AS company_name, c.logo_url AS company_logo_url
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE ${where}
       ORDER BY j.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    return { jobs: dataResult.rows, total };
  }

  async findActiveJobById(id: string): Promise<JobWithCompanyRow | null> {
    const result = await this.db.query<JobWithCompanyRow>(
      `SELECT j.*, c.name AS company_name, c.logo_url AS company_logo_url
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE j.id = $1 AND j.is_active = TRUE`,
      [id],
    );
    return result.rows[0] ?? null;
  }

}
