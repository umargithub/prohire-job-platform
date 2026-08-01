import { JobsRepository } from "../jobs/jobs.repository";
import { ApplicationRepository } from "./application.repository";
import { CandidateRepository } from "../candidate/candidate.repository";
import { EmailQueue } from "../../core/queue/email.queue";
import {
  ApplicationRow,
  ApplicationDetailRow,
  ApplicationStage,
  EmailStage,
  ApplicationWithCandidateRow,
  ApplicationWithJobRow,
  PaginatedApplications,
} from "./application.types";
import { GetApplicationsQueryInput } from "./application.dto";
import {
  ConflictError,
  DuplicateApplicationError,
  InvalidStageTransitionError,
  JobInactiveError,
  NotFoundError,
  ProfileRequiredError,
} from "../../core/errors/AppError";

/**
 * "rejected" is a terminal outcome reachable from any active stage, not a
 * step in the pipeline — a company can reject right after "applied" without
 * ever marking it "reviewed". Only reviewed → interview → offered has an
 * actual order.
 */
const PIPELINE_ORDER: Record<Exclude<ApplicationStage, "rejected">, number> = {
  applied: 0,
  reviewed: 1,
  interview: 2,
  offered: 3,
};

/**
 * Guards against moving an application backward (e.g. interview → reviewed)
 * or re-setting its current stage — both would still fire a real
 * "stage changed" email to the candidate with no actual change to report,
 * which reads as a confusing signal. "rejected" is terminal: reachable from
 * anywhere, but not reversible from here.
 */
function assertValidStageTransition(
  current: ApplicationStage,
  next: EmailStage,
): void {
  if (next === current) {
    throw new InvalidStageTransitionError(
      `This application is already in the "${next}" stage.`,
    );
  }
  if (current === "rejected") {
    throw new InvalidStageTransitionError(
      "This application has been rejected and can't be moved to another stage.",
    );
  }
  if (next === "rejected") return;
  if (PIPELINE_ORDER[next] < PIPELINE_ORDER[current]) {
    throw new InvalidStageTransitionError(
      `Can't move an application backward from "${current}" to "${next}".`,
    );
  }
}

export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly jobsRepository: JobsRepository,
    private readonly candidateRepository: CandidateRepository,
    private readonly emailQueue: EmailQueue,
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
    stage: EmailStage,
    version: number,
  ): Promise<ApplicationRow> {
    const detail = await this.applicationRepository.findById(
      applicationId,
      ownerId,
    );
    if (!detail) throw new NotFoundError("Application");

    assertValidStageTransition(detail.stage, stage);

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

    await this.emailQueue.enqueueStageChangedEmail(
      detail.candidate_email,
      stage,
      detail.job_title,
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
