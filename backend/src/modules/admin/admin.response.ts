export interface AdminCompanyResponse {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  isDeleted: boolean;
  createdAt: Date;
}

export interface AdminJobResponse {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  location: string | null;
  jobType: string;
  experienceLevel: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  role: "candidate" | "company" | "admin" | "super_admin" | "moderator";
  isVerified: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminStatsResponse {
  users: {
    total: number;
    byRole: { candidate: number; company: number; admin: number; super_admin: number; moderator: number };
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
