import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { AppError } from "../errors/AppError";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_RESUME_TYPES = ["application/pdf"];
const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function makeFilter(allowed: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Invalid file type. Allowed: ${allowed.join(", ")}`, 422, "INVALID_FILE_TYPE"));
    }
  };
}

export const uploadResume = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: makeFilter(ALLOWED_RESUME_TYPES),
}).single("resume");

export const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: makeFilter(ALLOWED_LOGO_TYPES),
}).single("logo");
