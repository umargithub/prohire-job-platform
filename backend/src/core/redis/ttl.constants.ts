export const TTL = {
  JOB_LIST: 300,            // 5 minutes
  JOB_DETAIL: 600,          // 10 minutes
  COMPANY_JOBS: 300,        // 5 minutes
  COMPANY_PROFILE: 300,     // 5 minutes
  JOB_LIST_FILTERED: 120,   // 2 minutes — large key space, surfaces new jobs quickly
  CANDIDATE_PROFILE: 300,   // 5 minutes
  RESEND_VERIFICATION: 86400, // 24 hours
} as const;
