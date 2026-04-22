import { JobsRepository } from "./jobs.repository";
import { JobRow, PaginatedJobs } from "./jobs.types";
import { ListJobsQueryInput } from "./jobs.dto";
import { getOrSet } from "../../core/redis/cache";
import { TTL } from "../../core/redis/ttl.constants";
import { NotFoundError } from "../../core/errors/AppError";

export class JobsService {
  constructor(private readonly jobsRepository: JobsRepository) {}

  private buildListCacheKey(filters: ListJobsQueryInput): string {
    const sorted = (Object.keys(filters) as (keyof ListJobsQueryInput)[])
      .sort()
      .filter((k) => filters[k] !== undefined)
      .map((k) => `${k}=${filters[k]}`)
      .join("&");
    return `prohire:jobs:list:${sorted}`;
  }

  async listJobs(filters: ListJobsQueryInput): Promise<PaginatedJobs> {
    const cacheKey = this.buildListCacheKey(filters);
    const { page, limit } = filters;
    return getOrSet<PaginatedJobs>(cacheKey, TTL.JOB_LIST_FILTERED, async () => {
      const { jobs, total } = await this.jobsRepository.findActiveJobs(filters);
      return { jobs, total, page, limit };
    });
  }

  async getJob(jobId: string): Promise<JobRow> {
    const cacheKey = `prohire:job:detail:${jobId}`;
    return getOrSet<JobRow>(cacheKey, TTL.JOB_DETAIL, async () => {
      const job = await this.jobsRepository.findActiveJobById(jobId);
      if (!job) throw new NotFoundError("Job");
      return job;
    });
  }
}
