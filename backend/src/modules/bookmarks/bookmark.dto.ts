import { z } from "zod";

export const AddBookmarkDto = z.object({
  jobId: z.string().uuid(),
});

export type AddBookmarkInput = z.infer<typeof AddBookmarkDto>;
