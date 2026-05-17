export interface CompanyMemberResponse {
  id: string;
  role: "owner" | "recruiter";
  createdAt: Date;
  user: {
    id: string;
    email: string;
  };
}

export interface CompanyResponse {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

