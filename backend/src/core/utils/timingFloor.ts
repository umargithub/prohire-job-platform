export async function withTimingFloor<T>(minMs: number, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - start;
    if (elapsed < minMs) {
      await new Promise<void>((resolve) => setTimeout(resolve, minMs - elapsed));
    }
  }
}
