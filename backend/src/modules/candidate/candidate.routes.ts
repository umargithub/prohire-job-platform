import { Router } from "express";
import { validate } from "../../core/middlewares/validate.middleware";
import { authenticate } from "../../core/middlewares/authenticate.middleware";
import { authorize } from "../../core/middlewares/authorize.middleware";
import { uploadResume, uploadAvatar } from "../../core/middlewares/upload.middleware";
import { createRateLimiter } from "../../core/middlewares/rateLimiter.middleware";
import { CandidateController } from "./candidate.controller";
import { UpsertCandidateProfileDto } from "./candidate.dto";

const resumeUploadLimiter = createRateLimiter(
  "resume-upload",
  10,
  60 * 60 * 1000,
  "user",
);

const avatarUploadLimiter = createRateLimiter(
  "avatar-upload",
  10,
  60 * 60 * 1000,
  "user",
);

export default function candidateRoutes(
  controller: CandidateController,
): Router {
  const router = Router();

  router.post(
    "/profile",
    authenticate,
    authorize("candidate"),
    validate(UpsertCandidateProfileDto),
    controller.createProfile,
  );

  router.get(
    "/profile",
    authenticate,
    authorize("candidate"),
    controller.getProfile,
  );

  router.put(
    "/profile",
    authenticate,
    authorize("candidate"),
    validate(UpsertCandidateProfileDto),
    controller.updateProfile,
  );

  router.patch(
    "/profile/resume",
    authenticate,
    authorize("candidate"),
    resumeUploadLimiter,
    ...uploadResume,
    controller.uploadResume,
  );

  router.patch(
    "/profile/avatar",
    authenticate,
    authorize("candidate"),
    avatarUploadLimiter,
    ...uploadAvatar,
    controller.uploadAvatar,
  );

  return router;
}
