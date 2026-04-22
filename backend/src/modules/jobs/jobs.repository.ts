import { DatabaseClient } from "../../core/database/db";
import { JobRow } from "./jobs.types";
import { ListJobsQueryInput } from "./jobs.dto";

export interface FindJobsResult {
  jobs: JobRow[];
  total: number;
}

export class JobsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findActiveJobs(filters: ListJobsQueryInput): Promise<FindJobsResult> {
    const conditions: string[] = ["is_active = TRUE"];
    const params: unknown[] = [];

    if (filters.title) {
      params.push(`%${filters.title}%`);
      conditions.push(`title ILIKE $${params.length}`);
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

    const dataResult = await this.db.query<JobRow>(
      `SELECT * FROM jobs
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    return { jobs: dataResult.rows, total };
  }

  async findActiveJobById(id: string): Promise<JobRow | null> {
    const result = await this.db.query<JobRow>(
      "SELECT * FROM jobs WHERE id = $1 AND is_active = TRUE",
      [id],
    );
    return result.rows[0] ?? null;
  }
}
