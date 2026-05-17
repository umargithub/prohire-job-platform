import { Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { CandidateService } from "./candidate.service";
import { UpsertCandidateProfileInput } from "./candidate.dto";
import { toCandidateProfileResponse } from "./candidate.mapper";
import { AppError } from "../../core/errors/AppError";

export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  createProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as UpsertCandidateProfileInput;
      const row = await this.candidateService.createProfile(
        req.user!.userId,
        input,
      );
      res
        .status(201)
        .json({ success: true, data: toCandidateProfileResponse(row) });
    },
  );

  getProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const row = await this.candidateService.getProfile(req.user!.userId);
      res
        .status(200)
        .json({ success: true, data: toCandidateProfileResponse(row) });
    },
  );

  updateProfile = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const input = req.body as UpsertCandidateProfileInput;
      const row = await this.candidateService.updateProfile(
        req.user!.userId,
        input,
      );
      res
        .status(200)
        .json({ success: true, data: toCandidateProfileResponse(row) });
    },
  );

  uploadResume = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const row = await this.candidateService.uploadResume(
        req.user!.userId,
        req.file!,
      );
      res
        .status(200)
        .json({ success: true, data: toCandidateProfileResponse(row) });
    },
  );

  uploadAvatar = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const row = await this.candidateService.uploadAvatar(
        req.user!.userId,
        req.file!,
      );
      res
        .status(200)
        .json({ success: true, data: toCandidateProfileResponse(row) });
    },
  );
}
