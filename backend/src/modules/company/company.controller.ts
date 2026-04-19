import { Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { CompanyService } from "./company.service";
import {
  UpsertCompanyProfileInput,
  CreateJobInput,
  UpdateJobInput,
} from "./company.dto";

export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // ── Profile ────────────────────────────────────────────────────────────────

  createProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as UpsertCompanyProfileInput;
      const data = await this.companyService.createProfile(
        req.user!.userId,
        input,
      );
      res.status(201).json({ success: true, data });
    },
  );

  getProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data = await this.companyService.getProfile(req.user!.userId);
      res.status(200).json({ success: true, data });
    },
  );

  updateProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as UpsertCompanyProfileInput;
      const data = await this.companyService.updateProfile(
        req.user!.userId,
        input,
      );
      res.status(200).json({ success: true, data });
    },
  );

  // ── Jobs ───────────────────────────────────────────────────────────────────

  createJob = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as CreateJobInput;
      const data = await this.companyService.createJob(req.user!.userId, input);
      res.status(201).json({ success: true, data });
    },
  );

  listJobs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const data = await this.companyService.listJobs(req.user!.userId);
      res.status(200).json({ success: true, data });
    },
  );

  getJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const jobId = req.params["id"]!;
    const data = await this.companyService.getJob(req.user!.userId, jobId);
    res.status(200).json({ success: true, data });
  });

  updateJob = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const jobId = req.params["id"]!;
      const input = req.body as UpdateJobInput;
      const data = await this.companyService.updateJob(
        req.user!.userId,
        jobId,
        input,
      );
      res.status(200).json({ success: true, data });
    },
  );

  deleteJob = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const jobId = req.params["id"]!;
      await this.companyService.deleteJob(req.user!.userId, jobId);
      res.status(204).send();
    },
  );
}
