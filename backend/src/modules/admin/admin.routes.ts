import { Router } from "express";
import { authenticate } from "../../core/middlewares/authenticate.middleware";
import { authorize } from "../../core/middlewares/authorize.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { validateQuery } from "../../core/middlewares/validateQuery.middleware";
import { validateUuidParam } from "../../core/middlewares/validateUuidParam.middleware";
import { AdminController } from "./admin.controller";
import {
  ListUsersQueryDto,
  ListCompaniesQueryDto,
  ListJobsQueryDto,
  CreateAdminUserDto,
} from "./admin.dto";

export default function adminRoutes(controller: AdminController): Router {
  const router = Router();

  router.param("id", validateUuidParam("id"));

  router.use(authenticate);

  // moderator, admin, super_admin — read-only
  router.get(
    "/users",
    authorize("moderator", "admin", "super_admin"),
    validateQuery(ListUsersQueryDto),
    controller.listUsers,
  );
  router.get(
    "/companies",
    authorize("moderator", "admin", "super_admin"),
    validateQuery(ListCompaniesQueryDto),
    controller.listCompanies,
  );
  router.get(
    "/jobs",
    authorize("moderator", "admin", "super_admin"),
    validateQuery(ListJobsQueryDto),
    controller.listJobs,
  );
  router.get(
    "/stats",
    authorize("moderator", "admin", "super_admin"),
    controller.getStats,
  );

  // admin, super_admin — content moderation
  router.patch(
    "/users/:id/verify",
    authorize("admin", "super_admin"),
    controller.verifyUser,
  );
  router.patch(
    "/jobs/:id/deactivate",
    authorize("admin", "super_admin"),
    controller.deactivateJob,
  );
  router.delete(
    "/companies/:id",
    authorize("admin", "super_admin"),
    controller.deleteCompany,
  );

  // super_admin only
  router.delete("/users/:id", authorize("super_admin"), controller.deleteUser);
  router.post(
    "/users",
    authorize("super_admin"),
    validate(CreateAdminUserDto),
    controller.createAdminUser,
  );

  return router;
}
