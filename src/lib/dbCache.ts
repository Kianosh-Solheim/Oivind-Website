import { collection, getDocs, getDocsFromCache, query, Query, DocumentData, QuerySnapshot } from 'firebase/firestore';

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
  try {
    const snap = await getDocs(q);
    cache.set(cacheKey, { data: snap, timestamp: now });
    stats.serverReads += snap.size;
    notify();
    return snap;
  } catch (err: any) {
    console.warn(`[Cache] Server fetch failed for ${cacheKey} (may be quota exceeded), falling back to local persistent cache:`, err);
    
    // Try to get from Firestore's persistent local cache (IndexedDB)
    try {
      const cachedSnap = await getDocsFromCache(q);
      if (cachedSnap && !cachedSnap.empty) {
        console.log(`[Cache] Serving ${cacheKey} from IndexedDB persistent cache (${cachedSnap.size} docs)`);
        cache.set(cacheKey, { data: cachedSnap, timestamp: now });
        stats.cacheHits += cachedSnap.size;
        notify();
        return cachedSnap;
      }
    } catch (cacheErr) {
      console.warn(`[Cache] IndexedDB cache lookup failed for ${cacheKey}:`, cacheErr);
    }

    // Fall back to memory cache even if older than CACHE_DURATION
    if (cached) {
      console.log(`[Cache] Serving stale ${cacheKey} from memory cache`);
      stats.cacheHits += cached.data.size;
      notify();
      return cached.data;
    }

    // Rethrow if no cache is available at all
    throw err;
  }
}

export function invalidateCache(cacheKey?: string) {
  if (cacheKey) {
    cache.delete(cacheKey);
  } else {
    cache.clear();
  }
}
