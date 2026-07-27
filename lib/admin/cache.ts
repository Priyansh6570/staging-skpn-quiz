const TTL_MS = 60_000;

const store = new Map<string, { at: number; value: unknown }>();

/**
 * Per-panel, not per-dashboard. Each admin page owns one key, so opening Districts never pays for
 * the integrity scan and a stale Overview never blocks a fresh Operations read.
 */
export async function cached<T>(key: string, build: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const value = await build();
  store.set(key, { at: Date.now(), value });
  return value;
}
