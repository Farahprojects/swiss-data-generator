
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { batchedLogger, logToSupabase } from '@/utils/batchedLogManager';
import { useAuth } from '@/contexts/AuthContext';

export function useBatchedLogging() {
  const location = useLocation();
  const { user } = useAuth();
  const previousPath = useRef<string | null>(null);
  
  // Initialize new batch when route changes
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Only create a new batch if the path actually changed
    if (previousPath.current !== currentPath) {
      const meta = { 
        route: currentPath,
        search: location.search,
        referrer: typeof document !== 'undefined' ? (previousPath.current || document.referrer || 'direct') : 'direct'
      };
      
      // Initialize a new batch for this page
      batchedLogger.initBatch(currentPath, meta);
      
      // Log the page change
      logToSupabase('Page loaded', { 
        level: 'info',
        data: { 
          isAuthenticated: !!user,
          timeOpened: new Date().toISOString(),
          fromPath: previousPath.current
        },
        meta
      });
      
      // Update previous path
      previousPath.current = currentPath;
    }
    
    // Flush logs when component unmounts or route changes
    return () => {
      batchedLogger.flushNow().catch(err => {
        console.error('Error flushing logs on route change:', err);
      });
    };
  }, [location.pathname, user]);
  
  // Helper function for component-level logging
  const logAction = (
    action: string, 
    level: 'debug' | 'info' | 'warn' | 'error' = 'info', 
    data?: any
  ) => {
    logToSupabase(`${action}`, { 
      page: location.pathname,
      level,
      data
    });
  };
  
  return { 
    logToSupabase, 
    logAction, 
    batchedLogger
  };
}
