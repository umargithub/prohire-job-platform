import { Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { JobsService } from "./jobs.service";
import { ApplicationService } from "../applications/application.service";
import { ListJobsQueryInput } from "./jobs.dto";
import { GetApplicationsQueryInput } from "../applications/application.dto";
import { toJobResponse } from "./jobs.mapper";
import { toCompanyApplicationResponse } from "../applications/application.mapper";

export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly applicationService: ApplicationService,
  ) {}

  listJobs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const filters = req.query as unknown as ListJobsQueryInput;
      const { jobs, total, page, limit } =
        await this.jobsService.listJobs(filters);
      res.status(200).json({
        success: true,
        data: { jobs: jobs.map(toJobResponse), total, page, limit },
      });
    },
  );

  getJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const jobId = req.params["id"]!;
    const row = await this.jobsService.getJob(jobId);
    res.status(200).json({ success: true, data: toJobResponse(row) });
  });

  getJobApplications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.userId;
      const jobId = req.params["jobId"]!;
      const filters = req.query as unknown as GetApplicationsQueryInput;
      const { applications, total, page, limit } =
        await this.applicationService.getJobApplications(userId, jobId, filters);
      res.status(200).json({
        success: true,
        data: {
          applications: applications.map(toCompanyApplicationResponse),
          total,
          page,
          limit,
        },
      });
    },
  );
}
