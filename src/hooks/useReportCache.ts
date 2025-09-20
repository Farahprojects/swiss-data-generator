import { useState, useEffect, useCallback, useRef } from 'react';
import { CachedReport, ReportCache } from '@/types/reportReference';
import { supabase } from '@/integrations/supabase/client';

const CACHE_TTL = Infinity; // No timeout - cache until session ends
const MAX_CACHE_SIZE = 1; // Only 1 report maximum per session

export const useReportCache = () => {
  const [cache, setCache] = useState<ReportCache>({});
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup expired cache entries - disabled since no timeout
  const cleanupExpiredCache = useCallback(() => {
    // No cleanup needed since TTL is Infinity
  }, []);

  // Get cached report if available
  const getCachedReport = useCallback((guestReportId: string) => {
    const entry = cache[guestReportId];
    if (!entry) return null;

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
      // Clear any existing cache since we only want 1 report
      const newCache = { [guestReportId]: newEntry };
      return newCache;
    });

  }, []);

  // Remove specific report from cache
  const removeFromCache = useCallback((guestReportId: string) => {
    setCache(prev => {
      const newCache = { ...prev };
      delete newCache[guestReportId];
      return newCache;
    });
  }, []);

  // Clear all cache
  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  // Fetch report data with caching
  const fetchReportData = useCallback(async (guestReportId: string) => {
    // Check cache first
    const cached = getCachedReport(guestReportId);
    if (cached) {
      return cached;
    }

    // Fetch fresh data
    
    try {
      const { data, error } = await supabase.functions.invoke('get-report-data', {
        body: { guest_report_id: guestReportId },
      });

      if (error || !data?.ready || !data?.data) {
        throw new Error(error?.message || 'Failed to fetch report data');
      }

      // Cache the result
      cacheReport(guestReportId, data.data);
      
      return data.data;
      
    } catch (err) {
      console.error(`❌ Error fetching report data for ${guestReportId}:`, err);
      throw err;
    }
  }, [getCachedReport, cacheReport]);

  // No cleanup interval needed since no timeout
  useEffect(() => {
    // Cleanup on unmount only
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

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