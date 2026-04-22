import { Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { CompanyService } from "./company.service";
import {
  UpsertCompanyProfileInput,
  CreateJobInput,
  UpdateJobInput,
} from "./company.dto";
import { toCompanyResponse, toJobResponse } from "./company.types";
import { AppError } from "../../core/errors/AppError";

export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // ── Profile ────────────────────────────────────────────────────────────────

  createProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as UpsertCompanyProfileInput;
      const row = await this.companyService.createProfile(req.user!.userId, input);
      res.status(201).json({ success: true, data: toCompanyResponse(row) });
    },
  );

  getProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const row = await this.companyService.getProfile(req.user!.userId);
      res.status(200).json({ success: true, data: toCompanyResponse(row) });
    },
  );

  updateProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as UpsertCompanyProfileInput;
      const row = await this.companyService.updateProfile(req.user!.userId, input);
      res.status(200).json({ success: true, data: toCompanyResponse(row) });
    },
  );

  uploadLogo = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (!req.file) throw new AppError("No file uploaded.", 422, "NO_FILE");
      const row = await this.companyService.uploadLogo(req.user!.userId, req.file);
      res.status(200).json({ success: true, data: toCompanyResponse(row) });
    },
  );

  // ── Jobs ───────────────────────────────────────────────────────────────────

  createJob = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as CreateJobInput;
      const row = await this.companyService.createJob(req.user!.userId, input);
      res.status(201).json({ success: true, data: toJobResponse(row) });
    },
  );

  listJobs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const rows = await this.companyService.listJobs(req.user!.userId);
      res.status(200).json({ success: true, data: rows.map(toJobResponse) });
    },
  );

  getJob = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const jobId = req.params["id"]!;
    const row = await this.companyService.getJob(req.user!.userId, jobId);
    res.status(200).json({ success: true, data: toJobResponse(row) });
  });

  updateJob = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const jobId = req.params["id"]!;
      const input = req.body as UpdateJobInput;
      const row = await this.companyService.updateJob(req.user!.userId, jobId, input);
      res.status(200).json({ success: true, data: toJobResponse(row) });
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
