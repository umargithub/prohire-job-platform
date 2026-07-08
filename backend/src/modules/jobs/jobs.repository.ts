import { DatabaseClient } from "../../core/database/db";
import type { JobWithCompanyRow } from "./jobs.types";
import { ListJobsQueryInput } from "./jobs.dto";
import { FindJobsResult } from "./jobs.types";

/**
 * Converts a raw user search string into a prefix tsquery, e.g.
 *   "dev"        -> "dev:*"
 *   "senior dev" -> "senior:* & dev:*"
 *   "node.js"    -> "node:* & js:*"
 *   "  +++  "    -> ""   (no valid tokens)
 *
 * Splits on non-alphanumerics and appends ":*" for prefix matching, so partial
 * typing matches. Returns "" when nothing usable remains, so the caller can fall
 * back to websearch_to_tsquery alone. Never feeds raw input to to_tsquery, which
 * throws on operator syntax like unbalanced "&", "|", or "(".
 */
function toPrefixTsQuery(search: string): string {
  const tokens = search
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);

  return tokens.map((token) => `${token}:*`).join(" & ");
}

export class JobsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findActiveJobs(filters: ListJobsQueryInput): Promise<FindJobsResult> {
    const conditions: string[] = ["is_active = TRUE"];
    const params: unknown[] = [];

    if (filters.search) {
      // Match either the stemmed whole-word query (so "devops" -> lexeme "devop"
      // matches) OR a prefix query (so partial typing like "dev" matches too).
      const prefixQuery = toPrefixTsQuery(filters.search);

      params.push(filters.search);
      const websearchParam = params.length;

      if (prefixQuery) {
        params.push(prefixQuery);
        const prefixParam = params.length;
        conditions.push(
          `(search_vector @@ websearch_to_tsquery('english', $${websearchParam}) OR search_vector @@ to_tsquery('english', $${prefixParam}))`,
        );
      } else {
        conditions.push(`search_vector @@ websearch_to_tsquery('english', $${websearchParam})`);
      }
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
       JOIN companies c ON c.id = j.company_id AND c.is_deleted = FALSE
       WHERE ${where}
       ORDER BY j.created_at DESC, j.id DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    return { jobs: dataResult.rows, total };
  }

  async findActiveJobById(id: string): Promise<JobWithCompanyRow | null> {
    const result = await this.db.query<JobWithCompanyRow>(
      `SELECT j.*, c.name AS company_name, c.logo_url AS company_logo_url
       FROM jobs j
       JOIN companies c ON c.id = j.company_id AND c.is_deleted = FALSE
       WHERE j.id = $1 AND j.is_active = TRUE`,
      [id],
    );
    return result.rows[0] ?? null;
  }

}
