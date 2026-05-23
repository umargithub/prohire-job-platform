import "dotenv/config";

const isProd = process.env["NODE_ENV"] === "production";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function requireEnvInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be an integer, got: "${raw}"`);
  return parsed;
}

export const config = {
  NODE_ENV: process.env["NODE_ENV"] ?? "development",
  PORT: requireEnvInt("PORT", 4000),
  FRONTEND_URL: process.env["FRONTEND_URL"] ?? "http://localhost:3000",
  TRUST_PROXY: process.env["TRUST_PROXY"] === "true",

  DATABASE_URL: requireEnv("DATABASE_URL"),
  REDIS_URL: requireEnv("REDIS_URL"),

  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_ACCESS_EXPIRES_IN: process.env["JWT_ACCESS_EXPIRES_IN"] ?? "15m",
  JWT_REFRESH_EXPIRES_IN: process.env["JWT_REFRESH_EXPIRES_IN"] ?? "7d",

  CLOUDINARY_CLOUD_NAME: requireEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: requireEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: requireEnv("CLOUDINARY_API_SECRET"),

  // SMTP — required in production; optional in dev (emails logged and skipped)
  SMTP_HOST: isProd ? requireEnv("SMTP_HOST") : process.env["SMTP_HOST"],
  SMTP_PORT: requireEnvInt("SMTP_PORT", 587),
  SMTP_USER: isProd ? requireEnv("SMTP_USER") : process.env["SMTP_USER"],
  SMTP_PASS: isProd ? requireEnv("SMTP_PASS") : process.env["SMTP_PASS"],
  EMAIL_FROM: isProd ? requireEnv("EMAIL_FROM") : process.env["EMAIL_FROM"] ?? "noreply@prohire.dev",
};
