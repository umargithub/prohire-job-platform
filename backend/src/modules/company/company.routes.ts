import { Router } from "express";
import { authenticate } from "../../core/middlewares/authenticate.middleware";
import { authorize } from "../../core/middlewares/authorize.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { CompanyController } from "./company.controller";
import {
  UpsertCompanyProfileDto,
  CreateJobDto,
  UpdateJobDto,
} from "./company.dto";

export default function companyRoutes(
  companyController: CompanyController,
): Router {
  const router = Router();

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
