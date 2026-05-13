export interface CompanyResponse {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobResponse {
  id: string;
  companyId: string;
  title: string;
  description: string;
  location: string | null;
  jobType: "remote" | "hybrid" | "onsite";
  experienceLevel: "junior" | "mid" | "senior";
  salaryMin: number | null;
  salaryMax: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
