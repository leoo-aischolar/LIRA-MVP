import { fetchJson } from '@/lib/api-client';

type MemoryFeedResponse = {
  items: unknown[];
};

const MEMORY_FEED_CACHE_TTL_MS = 30 * 1000;
const memoryFeedCache = new Map<string, { expiresAt: number; data: MemoryFeedResponse }>();
const memoryFeedInFlight = new Map<string, Promise<MemoryFeedResponse>>();

export async function fetchMemoryFeed<T extends MemoryFeedResponse = MemoryFeedResponse>(userId: string): Promise<T> {
  const cacheKey = userId.trim();
  if (!cacheKey) {
    return { items: [] } as unknown as T;
  }

  const now = Date.now();
  const cached = memoryFeedCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  const existingPromise = memoryFeedInFlight.get(cacheKey);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  const promise = fetchJson<MemoryFeedResponse>(`/api/memory?userId=${encodeURIComponent(cacheKey)}`)
    .then((data) => {
      memoryFeedCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + MEMORY_FEED_CACHE_TTL_MS,
      });
      return data;
    })
    .finally(() => {
      memoryFeedInFlight.delete(cacheKey);
    });

  memoryFeedInFlight.set(cacheKey, promise);
  return promise as Promise<T>;
}
