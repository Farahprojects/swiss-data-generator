import { useState, useEffect, useCallback, useRef } from 'react';
import { CachedReport, ReportCache } from '@/types/reportReference';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 10; // Maximum number of cached reports

export const useReportCache = () => {
  const [cache, setCache] = useState<ReportCache>({});
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup expired cache entries
  const cleanupExpiredCache = useCallback(() => {
    const now = Date.now();
    setCache(prevCache => {
      const newCache = { ...prevCache };
      let hasChanges = false;

      Object.keys(newCache).forEach(key => {
        const entry = newCache[key];
        if (now - entry.timestamp > entry.ttl) {
          delete newCache[key];
          hasChanges = true;
          console.log(`🗑️ Cache cleanup: Removed expired entry for ${key}`);
        }
      });

      return hasChanges ? newCache : prevCache;
    });
  }, []);

  // Get cached report if available and not expired
  const getCachedReport = useCallback((guestReportId: string) => {
    const entry = cache[guestReportId];
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Remove expired entry
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[guestReportId];
        return newCache;
      });
      return null;
    }

    return entry.data;
  }, [cache]);

  // Cache a report with TTL
  const cacheReport = useCallback((guestReportId: string, data: any) => {
    const now = Date.now();
    const newEntry: CachedReport = {
      data,
      timestamp: now,
      ttl: CACHE_TTL
    };

    setCache(prev => {
      const newCache = { ...prev, [guestReportId]: newEntry };

      // Enforce max cache size
      const entries = Object.entries(newCache);
      if (entries.length > MAX_CACHE_SIZE) {
        // Remove oldest entry
        const oldestKey = entries.reduce((oldest, [key, entry]) => 
          entry.timestamp < oldest[1].timestamp ? [key, entry] : oldest
        )[0];
        
        delete newCache[oldestKey];
        console.log(`🗑️ Cache limit: Removed oldest entry ${oldestKey}`);
      }

      return newCache;
    });

    console.log(`💾 Cached report for ${guestReportId}`);
  }, []);

  // Remove specific report from cache
  const removeFromCache = useCallback((guestReportId: string) => {
    setCache(prev => {
      const newCache = { ...prev };
      delete newCache[guestReportId];
      return newCache;
    });
    console.log(`🗑️ Removed from cache: ${guestReportId}`);
  }, []);

  // Clear all cache
  const clearCache = useCallback(() => {
    setCache({});
    console.log('🗑️ Cache cleared');
  }, []);

  // Fetch report data with caching
  const fetchReportData = useCallback(async (guestReportId: string) => {
    // Check cache first
    const cached = getCachedReport(guestReportId);
    if (cached) {
      return cached;
    }

    // Fetch fresh data
    console.log(`📥 Fetching fresh report data for ${guestReportId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('get-report-data', {
        body: { guest_report_id: guestReportId },
      });

      if (error || !data?.ready || !data?.data) {
        throw new Error(error?.message || 'Failed to fetch report data');
      }

      // Cache the result
      cacheReport(guestReportId, data.data);
      
      console.log(`✅ Report data fetched and cached for ${guestReportId}`);
      return data.data;
      
    } catch (err) {
      console.error(`❌ Error fetching report data for ${guestReportId}:`, err);
      throw err;
    }
  }, [getCachedReport, cacheReport]);

  // Setup cleanup interval
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(cleanupExpiredCache, 60000); // Clean every minute

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [cleanupExpiredCache]);

  // Manual cleanup on unmount
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  return {
    fetchReportData,
    getCachedReport,
    cacheReport,
    removeFromCache,
    clearCache,
    cacheSize: Object.keys(cache).length
  };
}; 