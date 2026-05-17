export interface AdminUserResponse {
  id: string;
  email: string;
  role: "candidate" | "company" | "admin";
  isVerified: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminStatsResponse {
  users: {
    total: number;
    byRole: { candidate: number; company: number; admin: number };
    verified: number;
    deleted: number;
  };
  jobs: {
    total: number;
    active: number;
  };
  applications: {
    total: number;
    byStage: Record<string, number>;
  };
  companies: {
    total: number;
    active: number;
  };
}
