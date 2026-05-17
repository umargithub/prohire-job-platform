import { Router } from "express";
import { authenticate } from "../../core/middlewares/authenticate.middleware";
import { authorize } from "../../core/middlewares/authorize.middleware";
import { validateQuery } from "../../core/middlewares/validateQuery.middleware";
import { AdminController } from "./admin.controller";
import { ListUsersQueryDto } from "./admin.dto";

export default function adminRoutes(controller: AdminController): Router {
  const router = Router();

  router.use(authenticate, authorize("admin"));

  router.get("/users", validateQuery(ListUsersQueryDto), controller.listUsers);
  router.delete("/users/:id", controller.deleteUser);
  router.delete("/companies/:id", controller.deleteCompany);
  router.get("/stats", controller.getStats);

  return router;
}
