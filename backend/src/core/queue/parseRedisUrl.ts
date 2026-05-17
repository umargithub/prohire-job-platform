interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
}

export function parseRedisUrl(url: string): RedisConnectionOptions {
  const parsed = new URL(url);
  const opts: RedisConnectionOptions = {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
  };
  if (parsed.password) opts.password = decodeURIComponent(parsed.password);
  return opts;
}
