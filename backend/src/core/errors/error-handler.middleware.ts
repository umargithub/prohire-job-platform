import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "./AppError";
import { logger } from "../utils/logger";

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Maximum allowed size is 5 MB."
        : err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Unexpected file field."
          : err.message;
    res.status(422).json({
      success: false,
      error: { code: err.code, message, statusCode: 422 },
    });
    return;
  }

  if (err instanceof ValidationError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
        errors: err.errors,
      },
    });
    return;
  }

  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  logger.error(
    { err, requestId: (req as Request & { id?: string }).id },
    "Unhandled error",
  );

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      statusCode: 500,
    },
  });
};
