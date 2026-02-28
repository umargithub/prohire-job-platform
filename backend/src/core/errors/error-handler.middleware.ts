import { Request, Response, NextFunction } from "express";
import { AppError, ValidationError } from "./AppError";
import { logger } from "../utils/logger";

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
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
