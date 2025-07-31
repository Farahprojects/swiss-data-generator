import { createContext, useContext, useState, ReactNode } from 'react';
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

  const open = (d: ReportPayload) => {
    console.log(`🚀 ReportModalProvider: open() called at ${new Date().toISOString()}`);
    console.log(`📦 ReportModalProvider: payload being set:`, d);
    setPayload(d);
  };

  const close = () => {
    console.log(`🚀 ReportModalProvider: close() called at ${new Date().toISOString()}`);
    setPayload(null);
  };

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