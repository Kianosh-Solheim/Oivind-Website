import { collection, getDocs, query, Query, DocumentData, QuerySnapshot } from 'firebase/firestore';

const cache = new Map<string, { data: QuerySnapshot<DocumentData>, timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export let stats = { serverReads: 0, cacheHits: 0 };
const listeners = new Set<() => void>();

export function subscribeToStats(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach(l => l());
}

export async function getCachedDocs(q: Query<DocumentData>, cacheKey: string) {
  const now = Date.now();
  const cached = cache.get(cacheKey);
  
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`[Cache] Serving ${cacheKey} from memory cache`);
    stats.cacheHits += cached.data.size;
    notify();
    return cached.data;
  }
  
  console.log(`[Cache] Fetching ${cacheKey} from server`);
  const snap = await getDocs(q);
  cache.set(cacheKey, { data: snap, timestamp: now });
  stats.serverReads += snap.size;
  notify();
  return snap;
}

export function invalidateCache(cacheKey?: string) {
  if (cacheKey) {
    cache.delete(cacheKey);
  } else {
    cache.clear();
  }
}
