import {
  ApplicationRow,
  ApplicationDetailRow,
  ApplicationWithCandidateRow,
  ApplicationWithJobRow,
} from "./application.types";

export function toApplicationResponse(row: ApplicationRow) {
  return {
    id: row.id,
    jobId: row.job_id,
    candidateId: row.candidate_id,
    coverLetter: row.cover_letter,
    stage: row.stage,
    version: row.version,
    appliedAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCandidateApplicationResponse(row: ApplicationWithJobRow) {
  return {
    id: row.id,
    stage: row.stage,
    version: row.version,
    coverLetter: row.cover_letter,
    appliedAt: row.created_at,
    updatedAt: row.updated_at,
    job: {
      id: row.job_id,
      title: row.job_title,
      company: {
        id: row.company_id,
        name: row.company_name,
      },
    },
  };
}

export function toApplicationDetailResponse(row: ApplicationDetailRow) {
  return {
    id: row.id,
    stage: row.stage,
    version: row.version,
    coverLetter: row.cover_letter,
    appliedAt: row.created_at,
    updatedAt: row.updated_at,
    job: {
      id: row.job_id,
      title: row.job_title,
    },
    candidate: {
      id: row.candidate_id,
      name: row.full_name,
      email: row.candidate_email,
      bio: row.bio,
      resumeUrl: row.resume_url,
      avatarUrl: row.avatar_url,
    },
  };
}

export function toCompanyApplicationResponse(row: ApplicationWithCandidateRow) {
  return {
    id: row.id,
    stage: row.stage,
    version: row.version,
    coverLetter: row.cover_letter,
    appliedAt: row.created_at,
    updatedAt: row.updated_at,
    candidate: {
      id: row.candidate_id,
      name: row.full_name,
      email: row.candidate_email,
      avatarUrl: row.avatar_url,
    },
  };
}
