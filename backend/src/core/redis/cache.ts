import { redis } from "./redis";

export async function getOrSet<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

export async function invalidate(keyPattern: string): Promise<void> {
  const keys = await redis.keys(keyPattern);
  if (keys.length > 0) await redis.del(...keys);
}
