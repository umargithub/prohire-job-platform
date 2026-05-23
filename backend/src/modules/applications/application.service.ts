import { JobsRepository } from "../jobs/jobs.repository";
import { ApplicationRepository } from "./application.repository";
import { CandidateRepository } from "../candidate/candidate.repository";
import {
  ApplicationRow,
  ApplicationDetailRow,
  ApplicationStage,
  ApplicationWithCandidateRow,
  ApplicationWithJobRow,
  PaginatedApplications,
} from "./application.types";
import { GetApplicationsQueryInput } from "./application.dto";
import {
  ConflictError,
  DuplicateApplicationError,
  JobInactiveError,
  NotFoundError,
  ProfileRequiredError,
} from "../../core/errors/AppError";

export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly jobsRepository: JobsRepository,
    private readonly candidateRepository: CandidateRepository,
  ) {}

  async applyToJob(
    candidateId: string,
    jobId: string,
    coverLetter?: string,
  ): Promise<ApplicationRow> {
    const profile =
      await this.candidateRepository.findProfileByUserId(candidateId);
    if (!profile) throw new ProfileRequiredError();

    const job = await this.jobsRepository.findActiveJobById(jobId);
    if (!job) throw new JobInactiveError();

    try {
      return await this.applicationRepository.create({
        jobId,
        candidateId,
        coverLetter,
      });
    } catch (err: unknown) {
      if (isUniqueConstraintError(err)) throw new DuplicateApplicationError();
      throw err;
    }
  }

  async getMyApplications(
    candidateId: string,
    filters: GetApplicationsQueryInput,
  ): Promise<PaginatedApplications<ApplicationWithJobRow>> {
    const { page, limit } = filters;
    const { applications, total } =
      await this.applicationRepository.findByCandidate(
        candidateId,
        page,
        limit,
      );
    return { applications, total, page, limit };
  }

  async getJobApplications(
    ownerId: string,
    jobId: string,
    filters: GetApplicationsQueryInput,
  ): Promise<PaginatedApplications<ApplicationWithCandidateRow>> {
    const { page, limit } = filters;
    const { applications, total } = await this.applicationRepository.findByJob(
      jobId,
      ownerId,
      page,
      limit,
    );
    return { applications, total, page, limit };
  }

  async getApplicationDetail(
    applicationId: string,
    userId: string,
  ): Promise<ApplicationDetailRow> {
    const application = await this.applicationRepository.findById(
      applicationId,
      userId,
    );
    if (!application) throw new NotFoundError("Application");
    return application;
  }

  async updateStage(
    applicationId: string,
    ownerId: string,
    stage: ApplicationStage,
    version: number,
  ): Promise<ApplicationRow> {
    const exists = await this.applicationRepository.existsForOwner(
      applicationId,
      ownerId,
    );
    if (!exists) throw new NotFoundError("Application");

    const result = await this.applicationRepository.updateStageWithVersion(
      applicationId,
      ownerId,
      stage,
      version,
    );
    if (!result)
      throw new ConflictError(
        "Application was modified by another request. Please refresh and try again.",
      );
    return result;
  }
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "23505"
  );
}
