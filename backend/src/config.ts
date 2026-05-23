import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const config = {
  NODE_ENV: process.env["NODE_ENV"] ?? "development",
  PORT: parseInt(process.env["PORT"] ?? "4000", 10),
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
  SMTP_HOST: process.env["NODE_ENV"] === "production" ? requireEnv("SMTP_HOST") : process.env["SMTP_HOST"],
  SMTP_PORT: parseInt(process.env["SMTP_PORT"] ?? "587", 10),
  SMTP_USER: process.env["NODE_ENV"] === "production" ? requireEnv("SMTP_USER") : process.env["SMTP_USER"],
  SMTP_PASS: process.env["NODE_ENV"] === "production" ? requireEnv("SMTP_PASS") : process.env["SMTP_PASS"],
  EMAIL_FROM: process.env["NODE_ENV"] === "production" ? requireEnv("EMAIL_FROM") : process.env["EMAIL_FROM"] ?? "noreply@prohire.dev",
};
