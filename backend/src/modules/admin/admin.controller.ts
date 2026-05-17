import { Request, Response } from "express";
import { asyncHandler } from "../../core/utils/asyncHandler";
import { AdminService } from "./admin.service";
import { ListUsersQueryInput } from "./admin.dto";
import { toAdminUserResponse } from "./admin.mapper";

export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = req.query as unknown as ListUsersQueryInput;
    const { users, total, page, limit } = await this.adminService.listUsers(filters);
    res.status(200).json({
      success: true,
      data: { users: users.map(toAdminUserResponse), total, page, limit },
    });
  });

  deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params["id"]!;
    await this.adminService.deleteUser(userId);
    res.status(204).send();
  });

  deleteCompany = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const companyId = req.params["id"]!;
    await this.adminService.deleteCompany(companyId);
    res.status(204).send();
  });

  getStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.adminService.getStats();
    res.status(200).json({ success: true, data: stats });
  });
}
