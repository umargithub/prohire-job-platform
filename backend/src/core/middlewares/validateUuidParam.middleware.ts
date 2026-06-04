import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../errors/AppError";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuidParam(paramName: string) {
  return (
    _req: Request,
    _res: Response,
    next: NextFunction,
    value: string,
  ): void => {
    if (!UUID_REGEX.test(value)) {
      next(new BadRequestError(`Invalid ${paramName} — must be a valid UUID`));
      return;
    }
    next();
  };
}
