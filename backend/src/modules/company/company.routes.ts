import { Router } from "express";
import { authenticate } from "../../core/middlewares/authenticate.middleware";
import { authorize } from "../../core/middlewares/authorize.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { uploadLogo } from "../../core/middlewares/upload.middleware";
import { createRateLimiter } from "../../core/middlewares/rateLimiter.middleware";
import { validateUuidParam } from "../../core/middlewares/validateUuidParam.middleware";
import { CompanyController } from "./company.controller";
import {
  UpsertCompanyProfileDto,
  CreateJobDto,
  UpdateJobDto,
  InviteMemberDto,
  AcceptInviteDto,
  TransferOwnershipDto,
} from "./company.dto";

const logoUploadLimiter = createRateLimiter("logo-upload", 10, 60 * 60 * 1000, "user");

export default function companyRoutes(
  companyController: CompanyController,
): Router {
  const router = Router();

  router.param("id", validateUuidParam("id"));
  router.param("userId", validateUuidParam("userId"));

  // ── Company profile ────────────────────────────────────────────────────────
  router.post(
    "/profile",
    authenticate,
    authorize("company"),
    validate(UpsertCompanyProfileDto),
    companyController.createProfile,
  );

  router.get(
    "/profile",
    authenticate,
    authorize("company"),
    companyController.getProfile,
  );

  router.put(
    "/profile",
    authenticate,
    authorize("company"),
    validate(UpsertCompanyProfileDto),
    companyController.updateProfile,
  );

  router.patch(
    "/profile/logo",
    authenticate,
    authorize("company"),
    logoUploadLimiter,
    ...uploadLogo,
    companyController.uploadLogo,
  );

  // ── Members ────────────────────────────────────────────────────────────────
  router.get(
    "/members",
    authenticate,
    authorize("company"),
    companyController.listMembers,
  );

  router.post(
    "/members/invite",
    authenticate,
    authorize("company"),
    validate(InviteMemberDto),
    companyController.inviteMember,
  );

  router.post(
    "/invites/accept",
    validate(AcceptInviteDto),
    companyController.acceptInvite,
  );

  router.post(
    "/transfer-ownership",
    authenticate,
    authorize("company"),
    validate(TransferOwnershipDto),
    companyController.transferOwnership,
  );

  router.delete(
    "/members/:userId",
    authenticate,
    authorize("company"),
    companyController.removeMember,
  );

  // ── Jobs ───────────────────────────────────────────────────────────────────
  router.post(
    "/jobs",
    authenticate,
    authorize("company"),
    validate(CreateJobDto),
    companyController.createJob,
  );

  router.get(
    "/jobs",
    authenticate,
    authorize("company"),
    companyController.listJobs,
  );

  router.get(
    "/jobs/:id",
    authenticate,
    authorize("company"),
    companyController.getJob,
  );

  router.patch(
    "/jobs/:id",
    authenticate,
    authorize("company"),
    validate(UpdateJobDto),
    companyController.updateJob,
  );

  router.delete(
    "/jobs/:id",
    authenticate,
    authorize("company"),
    companyController.deleteJob,
  );

  return router;
}
