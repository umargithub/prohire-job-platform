import fs from "fs";
import path from "path";
import { pool } from "./db";
import { logger } from "../utils/logger";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations ORDER BY filename",
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.info("No migrations directory found — skipping");
    return;
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    logger.info("All migrations are up to date");
    return;
  }

  const client = await pool.connect();
  try {
    for (const filename of pending) {
      const filePath = path.join(MIGRATIONS_DIR, filename);
      const sql = fs.readFileSync(filePath, "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [filename],
        );
        await client.query("COMMIT");
        logger.info({ filename }, "Applied migration");
      } catch (err) {
        await client.query("ROLLBACK");
        logger.error({ err, filename }, "Migration failed — rolled back");
        throw err;
      }
    }
  } finally {
    client.release();
  }

  logger.info({ count: pending.length }, "Migrations complete");
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, "Migration runner failed");
    process.exit(1);
  });
