export const queryKeys = {
  jobs: {
    list: (filters: Record<string, unknown>) => ['jobs', 'list', filters] as const,
    detail: (id: string) => ['jobs', id] as const,
  },
  candidate: {
    profile: () => ['candidate', 'profile'] as const,
    applications: (page: number) => ['candidate', 'applications', page] as const,
  },
  company: {
    profile: () => ['company', 'profile'] as const,
    jobs: () => ['company', 'jobs'] as const,
    job: (id: string) => ['company', 'jobs', id] as const,
    members: () => ['company', 'members'] as const,
    applications: (jobId: string, page: number) => ['company', 'applications', jobId, page] as const,
    applicationDetail: (id: string) => ['company', 'applications', id] as const,
  },
  admin: {
    stats: () => ['admin', 'stats'] as const,
    users: (filters: Record<string, unknown>) => ['admin', 'users', filters] as const,
    companies: (filters: Record<string, unknown>) => ['admin', 'companies', filters] as const,
    jobs: (filters: Record<string, unknown>) => ['admin', 'jobs', filters] as const,
  },
} as const;
