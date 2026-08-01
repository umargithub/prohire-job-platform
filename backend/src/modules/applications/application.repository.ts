import { DatabaseClient } from "../../core/database/db";
import {
  ApplicationRow,
  ApplicationDetailRow,
  ApplicationStage,
  ApplicationWithCandidateRow,
  ApplicationWithJobRow,
} from "./application.types";

export class ApplicationRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(data: {
    jobId: string;
    candidateId: string;
    coverLetter?: string;
  }): Promise<ApplicationRow> {
    const result = await this.db.query<ApplicationRow>(
      `INSERT INTO applications (job_id, candidate_id, cover_letter)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.jobId, data.candidateId, data.coverLetter ?? null],
    );
    return result.rows[0]!;
  }

  async findByCandidate(
    candidateId: string,
    page: number,
    limit: number,
  ): Promise<{ applications: ApplicationWithJobRow[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM applications WHERE candidate_id = $1`,
      [candidateId],
    );
    const total = parseInt(countResult.rows[0]!.count, 10);

    const dataResult = await this.db.query<ApplicationWithJobRow>(
      `SELECT a.*, j.title AS job_title, j.company_id, c.name AS company_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN companies c ON c.id = j.company_id AND c.is_deleted = FALSE
       WHERE a.candidate_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [candidateId, limit, offset],
    );

    return { applications: dataResult.rows, total };
  }

  async findByJob(
    jobId: string,
    ownerId: string,
    page: number,
    limit: number,
  ): Promise<{ applications: ApplicationWithCandidateRow[]; total: number }> {
    const offset = (page - 1) * limit;

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN company_members cm ON cm.company_id = j.company_id AND cm.user_id = $2
       WHERE a.job_id = $1`,
      [jobId, ownerId],
    );
    const total = parseInt(countResult.rows[0]!.count, 10);

    const dataResult = await this.db.query<ApplicationWithCandidateRow>(
      `SELECT a.*, u.email AS candidate_email, cp.full_name, cp.avatar_url
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN company_members cm ON cm.company_id = j.company_id AND cm.user_id = $2
       JOIN users u ON u.id = a.candidate_id AND u.is_deleted = FALSE
       JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
       WHERE a.job_id = $1
       ORDER BY a.created_at DESC
       LIMIT $3 OFFSET $4`,
      [jobId, ownerId, limit, offset],
    );

    return { applications: dataResult.rows, total };
  }

  async findById(
    applicationId: string,
    userId: string,
  ): Promise<ApplicationDetailRow | null> {
    const result = await this.db.query<ApplicationDetailRow>(
      `SELECT a.*,
              j.title       AS job_title,
              u.email       AS candidate_email,
              cp.full_name,
              cp.bio,
              cp.resume_url,
              cp.avatar_url
       FROM applications a
       JOIN jobs j                ON j.id          = a.job_id
       JOIN company_members cm    ON cm.company_id  = j.company_id AND cm.user_id = $2
       JOIN users u               ON u.id           = a.candidate_id AND u.is_deleted = FALSE
       JOIN candidate_profiles cp ON cp.user_id     = a.candidate_id
       WHERE a.id = $1`,
      [applicationId, userId],
    );
    return result.rows[0] ?? null;
  }

  async updateStageWithVersion(
    id: string,
    ownerId: string,
    stage: ApplicationStage,
    version: number,
  ): Promise<ApplicationRow | null> {
    const result = await this.db.query<ApplicationRow>(
      `UPDATE applications a
       SET stage = $1, version = version + 1, updated_at = NOW()
       FROM jobs j
       JOIN company_members cm ON cm.company_id = j.company_id AND cm.user_id = $4
       WHERE a.id = $2
         AND a.version = $3
         AND a.job_id = j.id
       RETURNING a.*`,
      [stage, id, version, ownerId],
    );
    return result.rows[0] ?? null;
  }
}
