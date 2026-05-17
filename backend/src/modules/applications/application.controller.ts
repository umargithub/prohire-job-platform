import { Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { ApplicationService } from "./application.service";
import {
  ApplyToJobInput,
  GetApplicationsQueryInput,
  UpdateStageInput,
} from "./application.dto";
import {
  toApplicationResponse,
  toApplicationDetailResponse,
  toCandidateApplicationResponse,
} from "./application.mapper";

export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  apply = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const candidateId = req.user!.userId;
    const { job_id, cover_letter } = req.body as ApplyToJobInput;
    const application = await this.applicationService.applyToJob(
      candidateId,
      job_id,
      cover_letter,
    );
    res.status(201).json({ success: true, data: toApplicationResponse(application) });
  });

  getMyApplications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const candidateId = req.user!.userId;
      const filters = req.query as unknown as GetApplicationsQueryInput;
      const { applications, total, page, limit } =
        await this.applicationService.getMyApplications(candidateId, filters);
      res.status(200).json({
        success: true,
        data: {
          applications: applications.map(toCandidateApplicationResponse),
          total,
          page,
          limit,
        },
      });
    },
  );

  getApplicationDetail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!.userId;
      const applicationId = req.params["id"]!;
      const application = await this.applicationService.getApplicationDetail(
        applicationId,
        userId,
      );
      res.status(200).json({ success: true, data: toApplicationDetailResponse(application) });
    },
  );

  updateStage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const ownerId = req.user!.userId;
      const applicationId = req.params["id"]!;
      const { stage, version } = req.body as UpdateStageInput;
      const application = await this.applicationService.updateStage(
        applicationId,
        ownerId,
        stage,
        version,
      );
      res.status(200).json({ success: true, data: toApplicationResponse(application) });
    },
  );
}
