import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Validates req.body against a Zod schema.
 *
 * On failure (422):
 * {
 *   success: false,
 *   error: {
 *     code: "VALIDATION_ERROR",
 *     message: "Validation failed",
 *     statusCode: 422,
 *     errors: [{ field: string, message: string }]
 *   }
 * }
 *
 * On success: replaces req.body with parsed, type-safe data and calls next()
 *
 * @note req.body shape after successful validation depends on the schema passed in.
 * Example: { email: "test@gmail.com", password: "secret123" }
 */
export const validate =
  (schema: ZodSchema): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          statusCode: 422,
          errors,
        },
      });
      return;
    }

    req.body = result.data;
    next();
  };
