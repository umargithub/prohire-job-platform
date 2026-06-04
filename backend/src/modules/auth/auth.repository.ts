import { PoolClient } from "pg";
import { DatabaseClient } from "../../core/database/db";
import { UserRow, TokenRow, RefreshTokenRow } from "./auth.types";

export class AuthRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findActiveByEmail(email: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      "SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE",
      [email],
    );
    return result.rows[0] ?? null;
  }

  async findActiveById(id: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      "SELECT * FROM users WHERE id = $1 AND is_deleted = FALSE",
      [id],
    );
    return result.rows[0] ?? null;
  }

  async createUser(
    input: {
      email: string;
      passwordHash: string;
      role: "candidate" | "company" | "admin" | "super_admin" | "moderator";
    },
    tx?: PoolClient,
  ): Promise<UserRow> {
    const client = tx ?? this.db;
    const result = await client.query<UserRow>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.email, input.passwordHash, input.role],
    );
    return result.rows[0]!;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.db.query(
      "UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1 AND is_deleted = FALSE",
      [userId],
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = FALSE",
      [passwordHash, userId],
    );
  }

  async saveVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    tx?: PoolClient,
  ): Promise<void> {
    const client = tx ?? this.db;
    await client.query(
      `INSERT INTO verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  }

  async deleteUserVerificationTokens(userId: string): Promise<void> {
    await this.db.query("DELETE FROM verification_tokens WHERE user_id = $1", [
      userId,
    ]);
  }

  async findVerificationToken(tokenHash: string): Promise<TokenRow | null> {
    const result = await this.db.query<TokenRow>(
      "SELECT * FROM verification_tokens WHERE token_hash = $1 AND expires_at > NOW()",
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async deleteVerificationToken(id: string): Promise<void> {
    await this.db.query("DELETE FROM verification_tokens WHERE id = $1", [id]);
  }

  async saveRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null> {
    const result = await this.db.query<RefreshTokenRow>(
      `SELECT rt.id, rt.user_id, rt.token_hash, rt.expires_at, rt.created_at,
              u.email, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id AND u.is_deleted = FALSE
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async deleteRefreshToken(tokenHash: string): Promise<void> {
    await this.db.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
      tokenHash,
    ]);
  }

  async savePasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );
  }

  async findPasswordResetToken(tokenHash: string): Promise<TokenRow | null> {
    const result = await this.db.query<TokenRow>(
      "SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW()",
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    await this.db.query("DELETE FROM password_reset_tokens WHERE id = $1", [
      id,
    ]);
  }

  async deleteUserPasswordResetTokens(userId: string): Promise<void> {
    await this.db.query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1",
      [userId],
    );
  }
}
