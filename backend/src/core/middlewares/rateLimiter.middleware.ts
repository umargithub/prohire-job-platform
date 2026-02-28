import { Request, Response, NextFunction, RequestHandler } from "express";
import { redis } from "../redis/redis";

interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

export const createRateLimiter = ({
  windowMs,
  max,
}: RateLimiterOptions): RequestHandler => {
  const windowSec = Math.ceil(windowMs / 1000);

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const key = `prohire:rate_limit:${ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, "-inf", windowStart);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, windowSec);

      const results = await pipeline.exec();

      // zcard result is at index 2
      const cardResult = results?.[2];
      const count = (cardResult?.[1] as number) ?? 0;

      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, max - count));
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((now + windowMs) / 1000).toString(),
      );

      if (count > max) {
        res.status(429).json({
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            statusCode: 429,
          },
        });
        return;
      }

      next();
    } catch (err) {
      // If Redis is unavailable, fail open to avoid blocking legitimate traffic
      next();
    }
  };
};
