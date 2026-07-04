import bcrypt from "bcrypt";
import type { Redis } from "ioredis";
import { AuthRepository } from "./auth.repository";
import {
  RegisterInput,
  LoginInput,
  ResendVerificationInput,
  ResetPasswordInput,
} from "./auth.dto";
import { generateAccessToken } from "../../shared/utils/jwt.utils";
import { hashToken, generateToken } from "../../shared/utils/crypto.utils";
import { EmailQueue } from "../../core/queue/email.queue";
import { DatabaseClient } from "../../core/database/db";
import {
  AppError,
  EmailNotVerifiedError,
  UnauthorizedError,
} from "../../core/errors/AppError";
import { withTimingFloor } from "../../core/utils/timingFloor";
import { TTL } from "../../core/redis/ttl.constants";
import { incrementWithTTL } from "../../core/redis/rate-limit";

const MAX_RESENDS_PER_DAY = 3;

const BCRYPT_ROUNDS = 12;

// Pre-computed at module load so login always runs bcrypt regardless of user existence.
const DUMMY_HASH_PROMISE = bcrypt.hash("__timing_sentinel__", BCRYPT_ROUNDS);
const VERIFICATION_TOKEN_EXPIRES_MS = 24 * 60 * 60 * 1000; // 24h
const REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7d
const PASSWORD_RESET_EXPIRES_MS = 60 * 60 * 1000; // 1h

export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly emailQueue: EmailQueue,
    private readonly db: DatabaseClient,
    private readonly redis: Redis,
  ) {}

  async registerCandidate(input: RegisterInput): Promise<{ message: string }> {
    const existing = await this.authRepository.findActiveByEmail(input.email);
    if (existing) throw new AppError("Email already in use", 409, "EMAIL_IN_USE");

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_MS);

    const user = await this.db.transaction(async (tx) => {
      const u = await this.authRepository.createUser(
        { email: input.email, passwordHash, role: "candidate" },
        tx,
      );
      await this.authRepository.saveVerificationToken(u.id, tokenHash, expiresAt, tx);
      return u;
    });

    await this.emailQueue.enqueueVerificationEmail(user.email, rawToken);
    return { message: "Registration successful. Please verify your email." };
  }

  async registerCompany(input: RegisterInput): Promise<{ message: string }> {
    const existing = await this.authRepository.findActiveByEmail(input.email);
    if (existing) throw new AppError("Email already in use", 409, "EMAIL_IN_USE");

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_MS);

    const user = await this.db.transaction(async (tx) => {
      const u = await this.authRepository.createUser(
        { email: input.email, passwordHash, role: "company" },
        tx,
      );
      await this.authRepository.saveVerificationToken(u.id, tokenHash, expiresAt, tx);
      return u;
    });

    await this.emailQueue.enqueueVerificationEmail(user.email, rawToken);
    return { message: "Registration successful. Please verify your email." };
  }

  async resendVerificationEmail(
    input: ResendVerificationInput,
  ): Promise<{ message: string; alreadyVerified?: true; rateLimited?: true }> {
    const SAFE_MESSAGE =
      "If that email exists and is unverified, a new verification email has been sent.";

    return withTimingFloor(200, async () => {
      const user = await this.authRepository.findActiveByEmail(input.email);

      if (!user) {
        return { message: SAFE_MESSAGE };
      }

      if (user.is_verified) {
        return { message: "Your email is already verified.", alreadyVerified: true };
      }

      const resendKey = `prohire:resend-count:${user.id}`;
      const count = await incrementWithTTL(this.redis, resendKey, TTL.RESEND_VERIFICATION);
      if (count > MAX_RESENDS_PER_DAY) {
        return { message: SAFE_MESSAGE, rateLimited: true };
      }

      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRES_MS);

      await this.db.transaction(async (tx) => {
        await this.authRepository.deleteUserVerificationTokens(user.id, tx);
        await this.authRepository.saveVerificationToken(user.id, tokenHash, expiresAt, tx);
      });
      await this.emailQueue.enqueueVerificationEmail(user.email, rawToken);

      return { message: SAFE_MESSAGE };
    });
  }

  async login(input: LoginInput): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: string };
  }> {
    const user = await this.authRepository.findActiveByEmail(input.email);
    const hashToCompare = user?.password_hash ?? await DUMMY_HASH_PROMISE;
    const valid = await bcrypt.compare(input.password, hashToCompare);

    if (!user || !valid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (!user.is_verified) {
      throw new EmailNotVerifiedError();
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
    });

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);
    await this.authRepository.saveRefreshToken(user.id, tokenHash, expiresAt);

    return {
      accessToken,
      refreshToken: rawToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async verifyEmail(rawToken: string): Promise<{ message: string }> {
    const tokenHash = hashToken(rawToken);

    return this.db.transaction(async (tx) => {
      const consumed = await this.authRepository.consumeVerificationToken(tokenHash, tx);

      if (!consumed) {
        const existing = await this.authRepository.findVerificationTokenAny(tokenHash, tx);

        if (!existing) {
          throw new AppError("Invalid or expired verification token", 400, "INVALID_TOKEN");
        }

        const user = await this.authRepository.findActiveById(existing.user_id, tx);
        if (user?.is_verified) return { message: "Email already verified." };

        throw new AppError("Invalid or expired verification token", 400, "INVALID_TOKEN");
      }

      await this.authRepository.markEmailVerified(consumed.user_id, tx);

      return { message: "Email verified successfully." };
    });
  }

  async refresh(rawToken: string): Promise<{
    accessToken: string;
    newRefreshToken: string;
    user: { id: string; email: string; role: string };
  }> {
    const tokenHash = hashToken(rawToken);
    const tokenRow = await this.authRepository.findRefreshToken(tokenHash);

    if (!tokenRow) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const newRawToken = generateToken();
    const newTokenHash = hashToken(newRawToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_MS);

    // Rotate: delete old token, issue new one atomically
    await this.db.transaction(async (tx) => {
      await this.authRepository.deleteRefreshToken(tokenHash, tx);
      await this.authRepository.saveRefreshToken(tokenRow.user_id, newTokenHash, newExpiresAt, tx);
    });

    const accessToken = generateAccessToken({
      userId: tokenRow.user_id,
      role: tokenRow.role,
    });

    return {
      accessToken,
      newRefreshToken: newRawToken,
      user: {
        id: tokenRow.user_id,
        email: tokenRow.email,
        role: tokenRow.role,
      },
    };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.authRepository.deleteRefreshToken(tokenHash);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const SAFE_MESSAGE =
      "If that email exists, a password reset link has been sent.";

    return withTimingFloor(200, async () => {
      const user = await this.authRepository.findActiveByEmail(email);
      if (!user) return { message: SAFE_MESSAGE };

      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);

      await this.db.transaction(async (tx) => {
        await this.authRepository.deleteUserPasswordResetTokens(user.id, tx);
        await this.authRepository.savePasswordResetToken(user.id, tokenHash, expiresAt, tx);
      });
      await this.emailQueue.enqueuePasswordResetEmail(user.email, rawToken);

      return { message: SAFE_MESSAGE };
    });
  }

  async resetPassword(
    rawToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const tokenHash = hashToken(rawToken);
    const tokenRow =
      await this.authRepository.findPasswordResetToken(tokenHash);

    if (!tokenRow) {
      throw new AppError(
        "Invalid or expired password reset token",
        400,
        "INVALID_TOKEN",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.db.transaction(async (tx) => {
      await this.authRepository.deletePasswordResetToken(tokenRow.id, tx);
      await this.authRepository.updatePassword(tokenRow.user_id, passwordHash, tx);
      await this.authRepository.deleteAllRefreshTokensForUser(tokenRow.user_id, tx);
    });

    return { message: "Password reset successfully." };
  }

  async getMe(
    userId: string,
  ): Promise<{ id: string; email: string; role: string; isVerified: boolean }> {
    const user = await this.authRepository.findActiveById(userId);
    if (!user) throw new UnauthorizedError("User not found");
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified,
    };
  }
}
