import { DatabaseClient } from "../../core/database/db";
import { CandidateProfileRow } from "./candidate.types";
import { UpsertCandidateProfileInput } from "./candidate.dto";

export class CandidateRepository {
  constructor(private readonly db: DatabaseClient) {}

  async createProfile(
    userId: string,
    input: UpsertCandidateProfileInput,
  ): Promise<CandidateProfileRow> {
    const result = await this.db.query<CandidateProfileRow>(
      `INSERT INTO candidate_profiles (user_id, full_name, bio, resume_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, input.full_name, input.bio ?? null, input.resume_url ?? null],
    );
    return result.rows[0]!;
  }

  async findProfileByUserId(
    userId: string,
  ): Promise<CandidateProfileRow | null> {
    const result = await this.db.query<CandidateProfileRow>(
      "SELECT * FROM candidate_profiles WHERE user_id = $1",
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async updateResumeUrl(
    userId: string,
    resumeUrl: string,
  ): Promise<CandidateProfileRow | null> {
    const result = await this.db.query<CandidateProfileRow>(
      `UPDATE candidate_profiles
       SET resume_url = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [resumeUrl, userId],
    );
    return result.rows[0] ?? null;
  }

  async updateProfile(
    userId: string,
    input: UpsertCandidateProfileInput,
  ): Promise<CandidateProfileRow | null> {
    const result = await this.db.query<CandidateProfileRow>(
      `UPDATE candidate_profiles
       SET full_name = $1, bio = $2, resume_url = $3, updated_at = NOW()
       WHERE user_id = $4
       RETURNING *`,
      [input.full_name, input.bio ?? null, input.resume_url ?? null, userId],
    );
    return result.rows[0] ?? null;
  }
}
