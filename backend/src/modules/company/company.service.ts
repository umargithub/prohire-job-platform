import { CompanyRepository } from "./company.repository";
import { CompanyRow, CompanyMemberWithEmailRow } from "./company.types";
import { JobWithCompanyRow } from "../jobs/jobs.types";
import {
  UpsertCompanyProfileInput,
  CreateJobInput,
  UpdateJobInput,
} from "./company.dto";
import { EmailQueue } from "../../core/queue/email.queue";
import { getOrSet, invalidate } from "../../core/redis/cache";
import { TTL } from "../../core/redis/ttl.constants";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "../../core/errors/AppError";
import { uploadToCloudinary, deleteFromCloudinary } from "../../core/utils/cloudinary";
import { generateToken, hashToken } from "../../shared/utils/crypto.utils";

const INVITE_TOKEN_EXPIRES_MS = 48 * 60 * 60 * 1000; // 48 hours

export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly emailQueue: EmailQueue,
  ) {}

  // ── Profile ────────────────────────────────────────────────────────────────

  async createProfile(
    userId: string,
    input: UpsertCompanyProfileInput,
  ): Promise<CompanyRow> {
    const existing = await this.companyRepository.findCompanyByMembership(userId);
    if (existing) throw new ConflictError("Company profile already exists.");
    return this.companyRepository.createCompanyWithOwner(userId, input);
  }

  async getProfile(userId: string): Promise<CompanyRow> {
    const company = await this.resolveCompanyAsMember(userId);
    const cacheKey = `prohire:company:profile:${company.id}`;
    return getOrSet<CompanyRow>(cacheKey, TTL.COMPANY_PROFILE, async () => company);
  }

  async updateProfile(
    userId: string,
    input: UpsertCompanyProfileInput,
  ): Promise<CompanyRow> {
    const company = await this.resolveCompanyAsOwner(userId);
    const updated = await this.companyRepository.updateCompany(company.owner_id, input);
    if (!updated) throw new NotFoundError("Company profile");
    await invalidate(`prohire:company:profile:${company.id}`);
    return updated;
  }

  async uploadLogo(
    userId: string,
    file: Express.Multer.File,
  ): Promise<CompanyRow> {
    const company = await this.resolveCompanyAsOwner(userId);

    if (company.logo_url) {
      await deleteFromCloudinary(company.logo_url);
    }

    const logoUrl = await uploadToCloudinary(file.buffer, "logos");
    const updated = await this.companyRepository.updateLogoUrl(company.owner_id, logoUrl);
    if (!updated) throw new NotFoundError("Company profile");
    await invalidate(`prohire:company:profile:${company.id}`);
    return updated;
  }

  // ── Members ────────────────────────────────────────────────────────────────

  async listMembers(userId: string): Promise<CompanyMemberWithEmailRow[]> {
    const company = await this.resolveCompanyAsMember(userId);
    return this.companyRepository.findMembersByCompanyId(company.id);
  }

  async inviteMember(ownerUserId: string, email: string): Promise<{ message: string }> {
    const company = await this.resolveCompanyAsOwner(ownerUserId);

    const existingUser = await this.companyRepository.findUserByEmail(email);
    if (existingUser) {
      const existingMember = await this.companyRepository.findMemberByUserId(company.id, existingUser.id);
      if (existingMember) throw new ConflictError("This user is already a member of your company.");
    }

    // Delete any existing pending invite so the unique constraint doesn't block resends
    const existingInvite = await this.companyRepository.findInviteByEmail(company.id, email);
    if (existingInvite) await this.companyRepository.deleteInvite(existingInvite.id);

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRES_MS);

    await this.companyRepository.createInvite(company.id, email, tokenHash, expiresAt);
    await this.emailQueue.enqueueCompanyInviteEmail(email, rawToken, company.name);

    return { message: `Invite sent to ${email}.` };
  }

  async acceptInvite(rawToken: string): Promise<{ message: string }> {
    const tokenHash = hashToken(rawToken);
    const invite = await this.companyRepository.findInviteByTokenHash(tokenHash);
    if (!invite) throw new AppError("Invalid or expired invite token.", 400, "INVALID_TOKEN");

    const user = await this.companyRepository.findUserByEmail(invite.email);
    if (!user) {
      throw new AppError(
        "No company account found for this email. Please register first.",
        400,
        "ACCOUNT_NOT_FOUND",
      );
    }
    if (user.role !== "company") {
      throw new ForbiddenError("Only company accounts can join a team.");
    }

    const existingMember = await this.companyRepository.findMemberByUserId(invite.company_id, user.id);
    if (existingMember) {
      await this.companyRepository.deleteInvite(invite.id);
      return { message: "You are already a member of this company." };
    }

    await this.companyRepository.acceptInvite(invite.id, invite.company_id, user.id);
    return { message: "You have successfully joined the company." };
  }

  async transferOwnership(ownerUserId: string, newOwnerUserId: string): Promise<void> {
    if (ownerUserId === newOwnerUserId) throw new ConflictError("You are already the owner.");
    const company = await this.resolveCompanyAsOwner(ownerUserId);
    const success = await this.companyRepository.transferOwnership(company.id, ownerUserId, newOwnerUserId);
    if (!success) throw new NotFoundError("Member");
    await invalidate(`prohire:company:profile:${company.id}`);
  }

  async removeMember(ownerUserId: string, targetUserId: string): Promise<void> {
    const company = await this.resolveCompanyAsOwner(ownerUserId);
    if (targetUserId === ownerUserId) {
      throw new ForbiddenError("The owner cannot be removed from the company.");
    }
    const removed = await this.companyRepository.removeMember(company.id, targetUserId);
    if (!removed) throw new NotFoundError("Member");
  }

  // ── Jobs ───────────────────────────────────────────────────────────────────

  private async resolveCompanyAsMember(userId: string): Promise<CompanyRow> {
    const company = await this.companyRepository.findCompanyByMembership(userId);
    if (!company) throw new NotFoundError("Company profile");
    return company;
  }

  private async resolveCompanyAsOwner(userId: string): Promise<CompanyRow> {
    const company = await this.resolveCompanyAsMember(userId);
    if (company.owner_id !== userId) {
      throw new ForbiddenError("Only the company owner can perform this action.");
    }
    return company;
  }

  async createJob(userId: string, input: CreateJobInput): Promise<JobWithCompanyRow> {
    const company = await this.resolveCompanyAsMember(userId);
    const job = await this.companyRepository.createJob(company.id, input);
    await invalidate(`prohire:company:jobs:${company.id}`);
    await invalidate("prohire:jobs:list:*");
    return job;
  }

  async listJobs(userId: string): Promise<JobWithCompanyRow[]> {
    const company = await this.resolveCompanyAsMember(userId);
    const cacheKey = `prohire:company:jobs:${company.id}`;
    return getOrSet<JobWithCompanyRow[]>(cacheKey, TTL.COMPANY_JOBS, () =>
      this.companyRepository.findJobsByCompanyId(company.id),
    );
  }

  async getJob(userId: string, jobId: string): Promise<JobWithCompanyRow> {
    const company = await this.resolveCompanyAsMember(userId);
    const cacheKey = `prohire:job:${company.id}:${jobId}`;
    const job = await getOrSet<JobWithCompanyRow>(cacheKey, TTL.JOB_DETAIL, async () => {
      const row = await this.companyRepository.findJobById(jobId, company.id);
      if (!row) throw new NotFoundError("Job");
      return row;
    });
    return job;
  }

  async updateJob(
    userId: string,
    jobId: string,
    input: UpdateJobInput,
  ): Promise<JobWithCompanyRow> {
    const company = await this.resolveCompanyAsMember(userId);
    const job = await this.companyRepository.updateJob(
      jobId,
      company.id,
      input,
    );
    if (!job) throw new NotFoundError("Job");
    await invalidate(`prohire:job:${company.id}:${jobId}`);
    await invalidate(`prohire:company:jobs:${company.id}`);
    await invalidate("prohire:jobs:list:*");
    await invalidate(`prohire:job:detail:${jobId}`);
    return job;
  }

  async deleteJob(userId: string, jobId: string): Promise<void> {
    const company = await this.resolveCompanyAsMember(userId);
    const deleted = await this.companyRepository.deactivateJob(
      jobId,
      company.id,
    );
    if (!deleted) throw new NotFoundError("Job");
    await invalidate(`prohire:job:${company.id}:${jobId}`);
    await invalidate(`prohire:company:jobs:${company.id}`);
    await invalidate("prohire:jobs:list:*");
    await invalidate(`prohire:job:detail:${jobId}`);
  }
}
