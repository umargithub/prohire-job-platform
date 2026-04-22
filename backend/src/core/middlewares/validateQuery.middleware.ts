import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema, ZodError } from "zod";

export const validateQuery =
  (schema: ZodSchema): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

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

    // Safe cast: result.data is the Zod-parsed output; Express types req.query as ParsedQs
    req.query = result.data as typeof req.query;
    next();
  };
