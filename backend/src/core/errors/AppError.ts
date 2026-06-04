export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly isOperational = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class DuplicateApplicationError extends AppError {
  constructor() {
    super(
      "You have already applied to this job.",
      409,
      "DUPLICATE_APPLICATION",
    );
  }
}

export class JobInactiveError extends AppError {
  constructor() {
    super("This job is no longer accepting applications.", 400, "JOB_INACTIVE");
  }
}

export class ProfileRequiredError extends AppError {
  constructor() {
    super(
      "You must complete your candidate profile before applying to jobs.",
      403,
      "PROFILE_REQUIRED",
    );
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super(
      "Please verify your email before logging in.",
      403,
      "EMAIL_NOT_VERIFIED",
    );
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, "BAD_REQUEST");
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly errors: Array<{ field: string; message: string }>,
  ) {
    super(message, 422, "VALIDATION_ERROR");
  }
}
