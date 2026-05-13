import { CompanyRepository } from "./company.repository";
import { CompanyRow, JobRow } from "./company.types";
import {
  UpsertCompanyProfileInput,
  CreateJobInput,
  UpdateJobInput,
} from "./company.dto";
import { getOrSet, invalidate } from "../../core/redis/cache";
import { TTL } from "../../core/redis/ttl.constants";
import { ConflictError, NotFoundError } from "../../core/errors/AppError";
import { uploadToCloudinary, deleteFromCloudinary } from "../../core/utils/cloudinary";

export class CompanyService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  // ── Profile ────────────────────────────────────────────────────────────────

  async createProfile(
    userId: string,
    input: UpsertCompanyProfileInput,
  ): Promise<CompanyRow> {
    const existing = await this.companyRepository.findCompanyByOwnerId(userId);
    if (existing) {
      throw new ConflictError("Company profile already exists.");
    }
    const company = await this.companyRepository.createCompany(userId, input);
    return company;
  }

  async getProfile(userId: string): Promise<CompanyRow> {
    const cacheKey = `prohire:company:profile:${userId}`;
    const company = await getOrSet<CompanyRow>(
      cacheKey,
      TTL.COMPANY_PROFILE,
      async () => {
        const row = await this.companyRepository.findCompanyByOwnerId(userId);
        if (!row) throw new NotFoundError("Company profile");
        return row;
      },
    );
    return company;
  }

  async updateProfile(
    userId: string,
    input: UpsertCompanyProfileInput,
  ): Promise<CompanyRow> {
    const company = await this.companyRepository.updateCompany(userId, input);
    if (!company) throw new NotFoundError("Company profile");
    await invalidate(`prohire:company:profile:${userId}`);
    return company;
  }

  async uploadLogo(
    userId: string,
    file: Express.Multer.File,
  ): Promise<CompanyRow> {
    const existing = await this.companyRepository.findCompanyByOwnerId(userId);
    if (!existing) throw new NotFoundError("Company profile");

    if (existing.logo_url) {
      await deleteFromCloudinary(existing.logo_url);
    }

    const logoUrl = await uploadToCloudinary(file.buffer, "logos");
    const company = await this.companyRepository.updateLogoUrl(userId, logoUrl);
    if (!company) throw new NotFoundError("Company profile");
    await invalidate(`prohire:company:profile:${userId}`);
    return company;
  }

  // ── Jobs ───────────────────────────────────────────────────────────────────

  private async resolveCompany(userId: string): Promise<CompanyRow> {
    const company = await this.companyRepository.findCompanyByOwnerId(userId);
    if (!company) throw new NotFoundError("Company profile");
    return company;
  }

  async createJob(userId: string, input: CreateJobInput): Promise<JobRow> {
    const company = await this.resolveCompany(userId);
    const job = await this.companyRepository.createJob(company.id, input);
    await invalidate(`prohire:company:jobs:${company.id}`);
    await invalidate("prohire:jobs:list:*");
    return job;
  }

  async listJobs(userId: string): Promise<JobRow[]> {
    const company = await this.resolveCompany(userId);
    const cacheKey = `prohire:company:jobs:${company.id}`;
    return getOrSet<JobRow[]>(cacheKey, TTL.COMPANY_JOBS, () =>
      this.companyRepository.findJobsByCompanyId(company.id),
    );
  }

  async getJob(userId: string, jobId: string): Promise<JobRow> {
    const company = await this.resolveCompany(userId);
    const cacheKey = `prohire:job:${company.id}:${jobId}`;
    const job = await getOrSet<JobRow>(cacheKey, TTL.JOB_DETAIL, async () => {
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
  ): Promise<JobRow> {
    const company = await this.resolveCompany(userId);
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
    const company = await this.resolveCompany(userId);
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
