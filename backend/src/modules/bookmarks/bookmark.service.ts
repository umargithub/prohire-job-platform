import { BookmarkRepository } from "./bookmark.repository";
import { BookmarkResponse } from "./bookmark.response";
import { toBookmarkResponse } from "./bookmark.mapper";
import { ConflictError, NotFoundError } from "../../core/errors/AppError";

export class BookmarkService {
  constructor(private readonly bookmarkRepository: BookmarkRepository) {}

  async addBookmark(
    candidateId: string,
    jobId: string,
  ): Promise<{ id: string; jobId: string; createdAt: Date }> {
    const alreadyExists = await this.bookmarkRepository.exists(candidateId, jobId);
    if (alreadyExists) throw new ConflictError("Job is already bookmarked");

    const row = await this.bookmarkRepository.add(candidateId, jobId);
    return { id: row.id, jobId: row.job_id, createdAt: row.created_at };
  }

  async removeBookmark(candidateId: string, jobId: string): Promise<void> {
    const removed = await this.bookmarkRepository.remove(candidateId, jobId);
    if (!removed) throw new NotFoundError("Bookmark");
  }

  async getBookmarks(
    candidateId: string,
    page: number,
    limit: number,
  ): Promise<{
    bookmarks: BookmarkResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    const { bookmarks, total } = await this.bookmarkRepository.listByCandidateId(
      candidateId,
      limit,
      offset,
    );

    return {
      bookmarks: bookmarks.map(toBookmarkResponse),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
