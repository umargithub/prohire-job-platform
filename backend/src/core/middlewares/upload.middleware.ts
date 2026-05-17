import multer, { FileFilterCallback } from "multer";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { fileTypeFromBuffer } from "file-type";
import { AppError } from "../errors/AppError";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export type UploadFolder = "resumes" | "logos" | "avatars";

export const ALLOWED_MIME_TYPES: Record<UploadFolder, string[]> = {
  resumes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  logos: ["image/jpeg", "image/png", "image/webp"],
  avatars: ["image/jpeg", "image/png", "image/webp"],
};

// file-type cannot reliably detect doc/docx: .docx is a ZIP container (detected as
// application/zip) and .doc is a CFB binary with no reliable magic bytes. Only run
// the byte-level check for types where file-type is authoritative.
const MAGIC_BYTE_RELIABLE: Record<UploadFolder, string[]> = {
  resumes: ["application/pdf"],
  logos: ["image/jpeg", "image/png", "image/webp"],
  avatars: ["image/jpeg", "image/png", "image/webp"],
};

function makeFilter(folder: UploadFolder) {
  const allowed = ALLOWED_MIME_TYPES[folder];
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `Invalid file type. Allowed: ${allowed.join(", ")}`,
          422,
          "INVALID_FILE_TYPE",
        ),
      );
    }
  };
}

function requireFile(fieldName: string): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.file) {
      next(new AppError(`${fieldName} is required.`, 422, "MISSING_FILE"));
      return;
    }
    next();
  };
}

function validateFileContent(folder: UploadFolder): RequestHandler {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const reliable = MAGIC_BYTE_RELIABLE[folder];
    const declared = req.file!.mimetype;

    if (!reliable.includes(declared)) {
      next();
      return;
    }

    try {
      const detected = await fileTypeFromBuffer(req.file!.buffer);

      if (!detected || !reliable.includes(detected.mime)) {
        next(
          new AppError(
            `Invalid file content. Detected: ${detected?.mime ?? "unknown"}`,
            422,
            "INVALID_FILE_TYPE",
          ),
        );
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

function makeUploadMiddleware(
  folder: UploadFolder,
  fieldName: string,
): RequestHandler[] {
  return [
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: makeFilter(folder),
    }).single(fieldName),
    requireFile(fieldName),
    validateFileContent(folder),
  ];
}

export const uploadResume = makeUploadMiddleware("resumes", "resume");
export const uploadLogo = makeUploadMiddleware("logos", "logo");
export const uploadAvatar = makeUploadMiddleware("avatars", "avatar");
