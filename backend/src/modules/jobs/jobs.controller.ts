import { Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { JobsService } from "./jobs.service";
import { ListJobsQueryInput } from "./jobs.dto";
import { toJobResponse } from "../company/company.mapper";

export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

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
}
