import { Router } from "express";
import { createRateLimiter } from "../../core/middlewares/rateLimiter.middleware";
import { validateQuery } from "../../core/middlewares/validateQuery.middleware";
import { JobsController } from "./jobs.controller";
import { ListJobsQueryDto } from "./jobs.dto";

export default function jobsRoutes(controller: JobsController): Router {
  const router = Router();
  const browseLimit = createRateLimiter("jobs-browse", 60, 60_000, "ip");

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

  return router;
}
