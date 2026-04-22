import { CandidateRepository } from "./candidate.repository";
import { CandidateProfileRow } from "./candidate.types";
import { UpsertCandidateProfileInput } from "./candidate.dto";
import { getOrSet, invalidate } from "../../core/redis/cache";
import { TTL } from "../../core/redis/ttl.constants";
import { ConflictError, NotFoundError } from "../../core/errors/AppError";
import { uploadToCloudinary, deleteFromCloudinary } from "../../core/utils/cloudinary";

export class CandidateService {
  constructor(private readonly candidateRepository: CandidateRepository) {}

  async createProfile(
    userId: string,
    input: UpsertCandidateProfileInput,
  ): Promise<CandidateProfileRow> {
    const existing = await this.candidateRepository.findProfileByUserId(userId);
    if (existing) throw new ConflictError("Candidate profile already exists.");
    return this.candidateRepository.createProfile(userId, input);
  }

  async getProfile(userId: string): Promise<CandidateProfileRow> {
    const cacheKey = `prohire:candidate:profile:${userId}`;
    return getOrSet<CandidateProfileRow>(cacheKey, TTL.CANDIDATE_PROFILE, async () => {
      const profile = await this.candidateRepository.findProfileByUserId(userId);
      if (!profile) throw new NotFoundError("Candidate profile");
      return profile;
    });
  }

  async updateProfile(
    userId: string,
    input: UpsertCandidateProfileInput,
  ): Promise<CandidateProfileRow> {
    const profile = await this.candidateRepository.updateProfile(userId, input);
    if (!profile) throw new NotFoundError("Candidate profile");
    await invalidate(`prohire:candidate:profile:${userId}`);
    return profile;
  }

  async uploadResume(
    userId: string,
    file: Express.Multer.File,
  ): Promise<CandidateProfileRow> {
    const existing = await this.candidateRepository.findProfileByUserId(userId);
    if (!existing) throw new NotFoundError("Candidate profile");

    if (existing.resume_url) {
      await deleteFromCloudinary(existing.resume_url);
    }

    const resumeUrl = await uploadToCloudinary(file.buffer, "resumes", file.mimetype);
    const profile = await this.candidateRepository.updateResumeUrl(userId, resumeUrl);
    if (!profile) throw new NotFoundError("Candidate profile");
    await invalidate(`prohire:candidate:profile:${userId}`);
    return profile;
  }
}
