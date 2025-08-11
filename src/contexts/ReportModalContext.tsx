import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ReportData } from '@/utils/reportContentExtraction';
import { ReportViewer } from '@/components/public-report/ReportViewer';
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
    try { console.log(`[Modal] open called id=${guestReportId} @${Date.now()}`); } catch {}

    // Write flags when the modal opens
    try {
      sessionStorage.setItem('guestId', guestReportId);
      sessionStorage.setItem('success', '1');
      localStorage.setItem(`seen:${guestReportId}`, '1');
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
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-red-600 mb-4">Error loading report</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Go Back
          </button>
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