import type { Redis } from "ioredis";

/**
 * Atomically increments a counter key and sets its TTL on first creation.
 *
 * Uses a Lua script so the increment and conditional TTL assignment execute
 * as a single Redis command. This avoids the race condition in the two-command
 * INCR + EXPIRE pattern where a crash between the two commands leaves the key
 * without a TTL and the counter never resets.
 *
 * TTL is only set when the key is newly created (count === 1), preserving the
 * sliding-window semantics where the expiry is anchored to the first request.
 *
 * @returns The new counter value after incrementing.
 */
const INCR_WITH_TTL_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return count
`;

export async function incrementWithTTL(
  redis: Redis,
  key: string,
  ttlSeconds: number,
): Promise<number> {
  const result = await redis.eval(INCR_WITH_TTL_SCRIPT, 1, key, String(ttlSeconds));
  return result as number;
}
