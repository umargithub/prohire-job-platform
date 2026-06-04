import bcrypt from "bcrypt";
import { pool } from "../db";
import { logger } from "../../utils/logger";

if (process.env.NODE_ENV === "production") {
  logger.error("Seed script must not be run in production. Exiting.");
  process.exit(1);
}

const BCRYPT_ROUNDS = 12;

interface AdminSeed {
  email: string;
  password: string;
  role: "super_admin" | "admin" | "moderator";
}

// Development-only credentials. Change before any shared environment.
const ADMIN_SEEDS: AdminSeed[] = [
  {
    email: "superadmin@prohire.dev",
    password: "SuperAdmin@123",
    role: "super_admin",
  },
  {
    email: "admin@prohire.dev",
    password: "Admin@123",
    role: "admin",
  },
  {
    email: "moderator@prohire.dev",
    password: "Moderator@123",
    role: "moderator",
  },
];

async function seedAdmins(): Promise<void> {
  logger.info("Seeding admin accounts...");

  for (const seed of ADMIN_SEEDS) {
    const passwordHash = await bcrypt.hash(seed.password, BCRYPT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_verified)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role`,
      [seed.email, passwordHash, seed.role],
    );

    if (result.rowCount === 0) {
      logger.info({ email: seed.email, role: seed.role }, "Already exists — skipped");
    } else {
      logger.info({ email: seed.email, role: seed.role }, "Created");
    }
  }
}

async function main(): Promise<void> {
  try {
    await seedAdmins();
    logger.info("Admin seed complete");
  } catch (err) {
    logger.error({ err }, "Admin seed failed");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().then(() => process.exit(process.exitCode ?? 0));
