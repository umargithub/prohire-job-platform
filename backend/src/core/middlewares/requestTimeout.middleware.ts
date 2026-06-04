import { RequestHandler } from "express";
import { AppError } from "../errors/AppError";

export const requestTimeout = (ms: number): RequestHandler =>
  (_req, res, next) => {
    res.setTimeout(ms, () => {
      next(new AppError("Request timed out", 408, "REQUEST_TIMEOUT"));
    });
    next();
  };
