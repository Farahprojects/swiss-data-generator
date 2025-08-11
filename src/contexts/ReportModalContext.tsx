import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ReportData } from '@/utils/reportContentExtraction';
import { ReportViewer } from '@/components/public-report/ReportViewer';
import ErrorStateHandler from '@/components/public-report/ErrorStateHandler';
import { logUserError } from '@/services/errorService';
import { ReportReference } from '@/types/reportReference';
import { useReportCache } from '@/hooks/useReportCache';
import { sessionManager } from '@/utils/sessionManager';

interface ModalContext {
  open: (guestReportId: string, metadata?: any) => void;
  close: () => void;
  isOpen: boolean;
  currentReport: ReportReference | null;
  cacheSize: number;
  clearCache: () => void;
}

const ReportModalContext = createContext<ModalContext | null>(null);

export const ReportModalProvider = ({ children }: { children: ReactNode }) => {
  const [currentReport, setCurrentReport] = useState<ReportReference | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { fetchReportData, removeFromCache, clearCache, cacheSize } = useReportCache();

  // Register with SessionManager for state reset
  useEffect(() => {
    const componentId = 'ReportModalProvider';
    
    const stateResetCallback = () => {
      console.log('🔄 ReportModalProvider: State reset triggered by SessionManager');
      setCurrentReport(null);
      setIsOpen(false);
      clearCache();
    };

    sessionManager.registerStateReset(componentId, stateResetCallback);

    return () => {
      sessionManager.unregisterStateReset(componentId);
    };
  }, [clearCache]);
 
  
  const open = useCallback(async (guestReportId: string, metadata?: any) => {
    if (!guestReportId) return console.warn('[ModalCTX] open called with null guestReportId');
    try {
      const stack = new Error().stack;
      console.log('🔎 [DEBUG][ReportModalContext.open] invoked', {
        guestReportId,
        metadata,
        ts: new Date().toISOString(),
        href: typeof window !== 'undefined' ? window.location.href : 'ssr'
      });
      if (stack) console.log('🔎 [DEBUG][ReportModalContext.open] stack', stack);
    } catch {}

    try {
      sessionStorage.setItem('guestId', guestReportId);
      // success flag removed; rely on seen flags only
      localStorage.setItem(`seen:${guestReportId}`, '1');
      localStorage.setItem('seen:last', guestReportId);
      console.log("[SeenFlag] wrote", `seen:${guestReportId}`, localStorage.getItem(`seen:${guestReportId}`));
    } catch {}

    const reportRef: ReportReference = {
      guestReportId,
      reportType: metadata?.report_type || 'unknown',
      engine: metadata?.engine || 'unknown',
      timestamp: Date.now(),
      metadata
    };
    
    setCurrentReport(reportRef);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    try { console.log(`[Modal] close @${Date.now()}`); } catch {}
    // Clean up cache for current report
    if (currentReport?.guestReportId) {
      removeFromCache(currentReport.guestReportId);
    }
    
    setCurrentReport(null);
    setIsOpen(false);
  }, [currentReport, removeFromCache]);

  return (
    <ReportModalContext.Provider value={{ 
      open, 
      close, 
      isOpen, 
      currentReport,
      cacheSize,
      clearCache
    }}>
      {children}
      {isOpen && currentReport && (
        <LazyReportViewer 
          reportReference={currentReport}
          onBack={close}
          onStateReset={() => {
            console.log('🔄 ReportModalProvider: State reset triggered');
          }}
        />
      )}
    </ReportModalContext.Provider>
  );
};

// Lazy loading component that fetches report data only when needed
const LazyReportViewer = ({ 
  reportReference, 
  onBack, 
  onStateReset 
}: { 
  reportReference: ReportReference; 
  onBack: () => void; 
  onStateReset?: () => void; 
}) => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchReportData } = useReportCache();

  // Register with SessionManager for state reset
  useEffect(() => {
    const componentId = `LazyReportViewer-${reportReference.guestReportId}`;
    
    const stateResetCallback = () => {
      console.log(`🔄 LazyReportViewer: State reset triggered by SessionManager for ${reportReference.guestReportId}`);
      setReportData(null);
      setLoading(false);
      setError(null);
    };

    sessionManager.registerStateReset(componentId, stateResetCallback);

    return () => {
      sessionManager.unregisterStateReset(componentId);
    };
  }, [reportReference.guestReportId]);

  // Fetch report data only when component mounts
  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchReportData(reportReference.guestReportId);
        setReportData(data);
        
      } catch (err) {
        console.error('❌ LazyReportViewer: Error fetching report data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [reportReference.guestReportId, fetchReportData]);

  // Cleanup function to clear report data when component unmounts
  useEffect(() => {
    return () => {
      setReportData(null);
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading your report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorState = {
      type: 'report_modal_load_error' as const,
      case_number: '',
      message: error,
      requires_error_logging: true,
      requires_session_cleanup: false
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <ErrorStateHandler 
            errorState={errorState}
            onTriggerErrorLogging={(guestReportId: string, email: string) => {
              logUserError({
                guestReportId,
                errorType: 'report_modal_load_error',
                errorMessage: error
              });
            }}
            onCleanupSession={() => {
              onBack();
            }}
          />
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <ReportViewer 
      reportData={reportData} 
      onBack={onBack}
      onStateReset={onStateReset}
    />
  );
};

export const useReportModal = () => {
  const ctx = useContext(ReportModalContext);
  if (!ctx) {
    // Return a no-op implementation during SSR or when context is not available
    return {
      open: () => {
        console.warn('useReportModal: Context not available, open() called during SSR or before provider mount');
      },
      close: () => {
        console.warn('useReportModal: Context not available, close() called during SSR or before provider mount');
      },
      isOpen: false,
      currentReport: null,
      cacheSize: 0,
      clearCache: () => {
        console.warn('useReportModal: Context not available, clearCache() called during SSR or before provider mount');
      }
    };
  }
  return ctx;
}; 