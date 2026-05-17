import { Router } from "express";
import { authenticate } from "../../core/middlewares/authenticate.middleware";
import { authorize } from "../../core/middlewares/authorize.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { validateQuery } from "../../core/middlewares/validateQuery.middleware";
import { ApplicationController } from "./application.controller";
import {
  ApplyToJobDto,
  GetApplicationsQueryDto,
  UpdateStageDto,
} from "./application.dto";

export default function applicationRoutes(
  controller: ApplicationController,
): Router {
  const router = Router();

  // Candidate: apply to a job
  router.post(
    "/",
    authenticate,
    authorize("candidate"),
    validate(ApplyToJobDto),
    controller.apply,
  );

  // Candidate: view own applications
  router.get(
    "/",
    authenticate,
    authorize("candidate"),
    validateQuery(GetApplicationsQueryDto),
    controller.getMyApplications,
  );

  // Company: view single application detail (full candidate profile + cover letter)
  router.get(
    "/:id",
    authenticate,
    authorize("company"),
    controller.getApplicationDetail,
  );

  // Company: update application stage (includes optimistic lock via version)
  router.patch(
    "/:id/stage",
    authenticate,
    authorize("company"),
    validate(UpdateStageDto),
    controller.updateStage,
  );

  return router;
}
