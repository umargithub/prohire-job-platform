import { Router } from "express";
import { validate } from "../../core/middlewares/validate.middleware";
import { authenticate } from "../../core/middlewares/authenticate.middleware";
import { authorize } from "../../core/middlewares/authorize.middleware";
import { uploadResume, uploadAvatar } from "../../core/middlewares/upload.middleware";
import { createRateLimiter } from "../../core/middlewares/rateLimiter.middleware";
import { validateUuidParam } from "../../core/middlewares/validateUuidParam.middleware";
import { CandidateController } from "./candidate.controller";
import { UpsertCandidateProfileDto } from "./candidate.dto";
import { AddBookmarkDto } from "../bookmarks/bookmark.dto";

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

  router.param("jobId", validateUuidParam("jobId"));

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

  router.get(
    "/bookmarks",
    authenticate,
    authorize("candidate"),
    controller.getBookmarks,
  );

  router.post(
    "/bookmarks",
    authenticate,
    authorize("candidate"),
    validate(AddBookmarkDto),
    controller.addBookmark,
  );

  router.delete(
    "/bookmarks/:jobId",
    authenticate,
    authorize("candidate"),
    controller.removeBookmark,
  );

  return router;
}
