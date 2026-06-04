import { DatabaseClient } from "../../core/database/db";
import { BookmarkRow, BookmarkWithJobRow } from "./bookmark.types";

export class BookmarkRepository {
  constructor(private readonly db: DatabaseClient) {}

  async add(candidateId: string, jobId: string): Promise<BookmarkRow> {
    const result = await this.db.query<BookmarkRow>(
      `INSERT INTO bookmarks (candidate_id, job_id)
       VALUES ($1, $2)
       RETURNING *`,
      [candidateId, jobId],
    );
    return result.rows[0]!;
  }

  async remove(candidateId: string, jobId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM bookmarks WHERE candidate_id = $1 AND job_id = $2`,
      [candidateId, jobId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listByCandidateId(
    candidateId: string,
    limit: number,
    offset: number,
  ): Promise<{ bookmarks: BookmarkWithJobRow[]; total: number }> {
    const [rows, count] = await Promise.all([
      this.db.query<BookmarkWithJobRow>(
        `SELECT b.*, j.title, c.name AS company_name, j.location, j.job_type, j.status
         FROM bookmarks b
         JOIN jobs j ON j.id = b.job_id
         JOIN companies c ON c.id = j.company_id
         WHERE b.candidate_id = $1
         ORDER BY b.created_at DESC
         LIMIT $2 OFFSET $3`,
        [candidateId, limit, offset],
      ),
      this.db.query<{ count: string }>(
        `SELECT COUNT(*) FROM bookmarks WHERE candidate_id = $1`,
        [candidateId],
      ),
    ]);

    return {
      bookmarks: rows.rows,
      total: parseInt(count.rows[0]!.count, 10),
    };
  }

  async exists(candidateId: string, jobId: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM bookmarks WHERE candidate_id = $1 AND job_id = $2
       ) AS exists`,
      [candidateId, jobId],
    );
    return result.rows[0]!.exists;
  }
}
