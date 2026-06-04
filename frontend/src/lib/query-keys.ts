export const queryKeys = {
  jobs: {
    list: (filters: Record<string, unknown>) => ['jobs', 'list', filters] as const,
    detail: (id: string) => ['jobs', id] as const,
    applications: (jobId: string, page: number) => ['jobs', jobId, 'applications', page] as const,
  },
  candidate: {
    profile: () => ['candidate', 'profile'] as const,
    applications: (page: number) => ['candidate', 'applications', page] as const,
  },
  company: {
    profile: () => ['company', 'profile'] as const,
    jobs: () => ['company', 'jobs'] as const,
    members: () => ['company', 'members'] as const,
  },
  admin: {
    stats: () => ['admin', 'stats'] as const,
    users: (filters: Record<string, unknown>) => ['admin', 'users', filters] as const,
    companies: (filters: Record<string, unknown>) => ['admin', 'companies', filters] as const,
    jobs: (filters: Record<string, unknown>) => ['admin', 'jobs', filters] as const,
  },
} as const;
