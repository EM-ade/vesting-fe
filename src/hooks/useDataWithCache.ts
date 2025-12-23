import { useState, useEffect, useRef } from "react";

// Simple in-memory cache store
const cacheStore: Record<string, { data: any; timestamp: number }> = {};

type CacheOptions = {
  ttl?: number; // Time to live in milliseconds (default: 60000ms = 1min)
  skipCache?: boolean;
};

export function useDataWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = 60000, skipCache = false } = options;
  const lastKeyRef = useRef(key);

  // Helper to get valid cache
  const getCachedData = (k: string) => {
    if (!skipCache && cacheStore[k]) {
      const { data, timestamp } = cacheStore[k];
      if (Date.now() - timestamp < ttl) {
        return data as T;
      }
    }
    return null;
  };

  // If key changed, check cache immediately
  if (lastKeyRef.current !== key) {
    lastKeyRef.current = key;
  }

  const cached = getCachedData(key);

  // Initialize state
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async (forceRefresh = false) => {
    // If we have valid cache and not forcing, use it
    const validCache = getCachedData(key);
    if (!forceRefresh && validCache) {
      setData(validCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await fetcher();
      cacheStore[key] = {
        data: result,
        timestamp: Date.now(),
      };
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [key]);

  // Derived state for render: if we don't have data and are loading (or key changed and no cache),
  // ensure we report loading correctly.
  // Actually, useEffect runs after render.
  // If key changed and no cache, 'data' state is still old value from previous key until useEffect runs?
  // No, we need to reset data if key doesn't match?
  // Use a derived variable for returned data.

  // If the internal state data corresponds to an old key, we shouldn't return it.
  // But we don't store "dataKey" in state.

  // Simpler approach:
  // When key changes, if no cache, we want data=null, loading=true.
  // We can force this by using key as a key on the component? No, that remounts.
  // We can return derived values.

  const currentData = cached || (loading ? null : data);
  // Wait, if loading is true, we might want to show skeleton, so return null data?
  // But if we are refreshing (loading=true) but have stale data, maybe we want to show it?
  // User wants skeleton on filter change.
  // Filter change = new key.
  // If new key has no cache, we should return null data and loading true.

  return {
    data: cached || (lastKeyRef.current === key ? data : null),
    loading: !cached && (loading || lastKeyRef.current !== key), // If key changed and no cache, we are effectively loading
    error,
    refresh: () => fetchData(true),
  };
}
