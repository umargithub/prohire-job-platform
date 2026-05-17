export interface JobResponse {
  id: string;
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
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
}
