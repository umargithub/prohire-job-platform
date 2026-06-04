import { Router, Request, Response } from "express";
import { pool } from "../../core/database/db";
import { redis } from "../../core/redis/redis";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const checks = await Promise.allSettled([
    pool.query("SELECT 1"),
    redis.ping(),
  ]);

  const db = checks[0]!.status === "fulfilled";
  const cache = checks[1]!.status === "fulfilled";
  const healthy = db && cache;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: { db, cache },
  });
});

export default router;
