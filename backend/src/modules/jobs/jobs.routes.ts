import { Router } from "express";
import { authenticate } from "../../core/middlewares/authenticate.middleware";
import { authorize } from "../../core/middlewares/authorize.middleware";
import { createRateLimiter } from "../../core/middlewares/rateLimiter.middleware";
import { validateQuery } from "../../core/middlewares/validateQuery.middleware";
import { validateUuidParam } from "../../core/middlewares/validateUuidParam.middleware";
import { JobsController } from "./jobs.controller";
import { ListJobsQueryDto } from "./jobs.dto";
import { GetApplicationsQueryDto } from "../applications/application.dto";

export default function jobsRoutes(controller: JobsController): Router {
  const router = Router();
  const browseLimit = createRateLimiter("jobs-browse", 60, 60_000, "ip");

  router.param("id", validateUuidParam("id"));
  router.param("jobId", validateUuidParam("jobId"));

  router.get(
    "/",
    browseLimit,
    validateQuery(ListJobsQueryDto),
    controller.listJobs,
  );

  router.get(
    "/:id",
    browseLimit,
    controller.getJob,
  );

  router.get(
    "/:jobId/applications",
    authenticate,
    authorize("company"),
    validateQuery(GetApplicationsQueryDto),
    controller.getJobApplications,
  );

  return router;
}
