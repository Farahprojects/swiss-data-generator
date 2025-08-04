import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ReportData } from '@/utils/reportContentExtraction';
import { ReportViewer } from '@/components/public-report/ReportViewer';

// Type for the report payload that can be opened anywhere in the app
// Example usage anywhere in the app:
// const { open } = useReportModal();
// open({ guest_report: {...}, report_content: "...", swiss_data: {...}, metadata: {...} });
type ReportPayload = ReportData;

interface ModalContext {
  open: (d: ReportPayload) => void;
  close: () => void;
}

const ReportModalContext = createContext<ModalContext | null>(null);

export const ReportModalProvider = ({ children }: { children: ReactNode }) => {
  const [payload, setPayload] = useState<ReportPayload | null>(null);

  // Restore modal state from sessionStorage on mount
  useEffect(() => {
    const storedPayload = sessionStorage.getItem('reportModalPayload');
    if (storedPayload) {
      try {
        const parsedPayload = JSON.parse(storedPayload);
        console.log('🔄 ReportModalProvider: Restoring modal state from sessionStorage');
        setPayload(parsedPayload);
      } catch (error) {
        console.warn('⚠️ ReportModalProvider: Failed to parse stored modal payload:', error);
        sessionStorage.removeItem('reportModalPayload');
      }
    }
  }, []);

  const open = (d: ReportPayload) => {
    if (!d) return console.warn('[ModalCTX] open called with null');
    console.log(`🚀 ReportModalProvider: open() called at ${new Date().toISOString()}`);
    console.log(`📦 ReportModalProvider: payload being set:`, d);
    
    // Persist modal state to sessionStorage
    sessionStorage.setItem('reportModalPayload', JSON.stringify(d));
    setPayload(d);
  };

  const close = () => {
    console.log(`🚀 ReportModalProvider: close() called at ${new Date().toISOString()}`);
    
    // Clear persisted modal state
    sessionStorage.removeItem('reportModalPayload');
    setPayload(null);
  };

  // Diagnostic logging for state changes
  useEffect(() => {
    console.info('[ModalCTX] state changed → payload:', payload);
  }, [payload]);

  return (
    <ReportModalContext.Provider value={{ open, close }}>
      {children}
      {payload && (
        <ReportViewer 
          reportData={payload} 
          onBack={close}
          onStateReset={() => {
            // Reset any global state if needed
            console.log('🔄 ReportModalProvider: State reset triggered');
          }}
        />
      )}
    </ReportModalContext.Provider>
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
      }
    };
  }
  return ctx;
}; 