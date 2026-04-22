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
};
