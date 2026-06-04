export type UserRole = 'candidate' | 'company' | 'admin' | 'super_admin' | 'moderator';

export type ApplicationStage = 'applied' | 'reviewed' | 'interview' | 'offered' | 'rejected';

export type JobType = 'remote' | 'hybrid' | 'onsite';
export type ExperienceLevel = 'junior' | 'mid' | 'senior';
export type CompanyMemberRole = 'owner' | 'recruiter';

// Auth
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface MeResponse extends AuthUser {}

export interface MessageResponse {
  message: string;
}

// Jobs
export interface JobResponse {
  id: string;
  title: string;
  description: string;
  location: string | null;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  salaryMin: number | null;
  salaryMax: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
}

export interface PaginatedJobs {
  jobs: JobResponse[];
  total: number;
  page: number;
  limit: number;
}

// Applications
export interface ApplicationResponse {
  id: string;
  jobId: string;
  candidateId: string;
  coverLetter: string | null;
  stage: ApplicationStage;
  version: number;
  appliedAt: string;
  updatedAt: string;
}

export interface CandidateApplicationResponse {
  id: string;
  stage: ApplicationStage;
  version: number;
  coverLetter: string | null;
  appliedAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    company: {
      id: string;
      name: string;
    };
  };
}

export interface CompanyApplicationResponse {
  id: string;
  stage: ApplicationStage;
  version: number;
  coverLetter: string | null;
  appliedAt: string;
  updatedAt: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface ApplicationDetailResponse {
  id: string;
  stage: ApplicationStage;
  version: number;
  coverLetter: string | null;
  appliedAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
  };
  candidate: {
    id: string;
    name: string;
    email: string;
    bio: string | null;
    resumeUrl: string | null;
    avatarUrl: string | null;
  };
}

export interface PaginatedApplications<T> {
  applications: T[];
  total: number;
  page: number;
  limit: number;
}

// Candidate Profile
export interface CandidateProfileResponse {
  id: string;
  fullName: string;
  bio: string | null;
  resumeUrl: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Company
export interface CompanyResponse {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMemberResponse {
  id: string;
  role: CompanyMemberRole;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
}

// Admin
export interface AdminUserResponse {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCompanyResponse {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface AdminJobResponse {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  location: string | null;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStatsResponse {
  users: {
    total: number;
    byRole: {
      candidate: number;
      company: number;
      admin: number;
      super_admin: number;
      moderator: number;
    };
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

export interface AdminPaginatedUsers {
  users: AdminUserResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPaginatedCompanies {
  companies: AdminCompanyResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPaginatedJobs {
  jobs: AdminJobResponse[];
  total: number;
  page: number;
  limit: number;
}

// API wrappers
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  statusCode: number;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}
