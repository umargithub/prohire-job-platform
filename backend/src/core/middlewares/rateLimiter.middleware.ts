import { Request, Response, NextFunction, RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../config";
import { redis } from "../redis/redis";
import { AppError } from "../errors/AppError";

/**
 * Atomic sliding-window rate limiter using a Lua script.
 *
 * The Lua script runs atomically on the Redis server, eliminating the
 * TOCTOU race condition present in pipeline-based implementations.
 *
 * Script inputs:
 *   KEYS[1]  — the sorted-set key
 *   ARGV[1]  — current timestamp (ms)
 *   ARGV[2]  — window start timestamp (ms) = now - windowMs
 *   ARGV[3]  — unique member id for this request
 *   ARGV[4]  — window size in milliseconds (used for PEXPIRE)
 *   ARGV[5]  — max requests allowed in the window
 *
 * Script returns: { count, allowed }
 *   count   — number of requests in the window after adding this one
 *   allowed — 1 if the request is allowed, 0 if rate-limited
 */
const LUA_SCRIPT = `
local key        = KEYS[1]
local now        = tonumber(ARGV[1])
local windowStart = tonumber(ARGV[2])
local member     = ARGV[3]
local windowMs   = tonumber(ARGV[4])
local limit      = tonumber(ARGV[5])

-- Remove entries outside the current window
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

-- Count requests already in the window
local count = redis.call('ZCARD', key)

if count >= limit then
  -- Rate-limited — do NOT add this request to the set
  return {count, 0}
end

-- Add this request and refresh the key TTL
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, windowMs)
count = count + 1

return {count, 1}
`;

/**
 * Create an Express rate-limiter middleware backed by Redis sliding window.
 *
 * @param action   - Logical name for this limiter (e.g. "global", "apply-job").
 *                   Becomes part of the Redis key so different limiters don't
 *                   share state.
 * @param limit    - Maximum number of requests allowed within `windowMs`.
 * @param windowMs - Sliding window duration in milliseconds.
 * @param scope    - "ip"     → one counter per IP address (default)
 *                   "global" → single shared counter for all IPs
 */
export function createRateLimiter(
  action: string,
  limit: number,
  windowMs: number,
  scope: "ip" | "global" = "ip",
): RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const ip =
      (config.TRUST_PROXY ? req.ip : req.socket.remoteAddress) ?? "unknown";

    const key =
      scope === "global"
        ? `prohire:rate_limit:global:${action}`
        : `prohire:rate_limit:ip:${action}:${ip}`;

    const now = Date.now();
    const windowStart = now - windowMs;
    const member = uuidv4();

    try {
      const result = (await redis.eval(
        LUA_SCRIPT,
        1,
        key,
        String(now),
        String(windowStart),
        member,
        String(windowMs),
        String(limit),
      )) as [number, number];

      const [count, allowed] = result;
      const remaining = Math.max(0, limit - count);
      const resetEpochSec = Math.ceil((now + windowMs) / 1000);

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", resetEpochSec.toString());

      if (allowed === 0) {
        next(
          new AppError(
            "Too many requests. Please try again later.",
            429,
            "RATE_LIMITED",
          ),
        );
        return;
      }

      next();
    } catch {
      // Fail open: if Redis is unavailable, allow the request through
      // to avoid blocking legitimate traffic during an outage.
      next();
    }
  };
}
