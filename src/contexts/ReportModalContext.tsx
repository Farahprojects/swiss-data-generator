import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ReportViewer } from '@/components/public-report/ReportViewer';

interface ReportReference {
  guestReportId: string;
}

interface ModalContext {
  open: (guestReportId: string, onLoad?: (error?: string | null) => void) => void;
  close: () => void;
  isOpen: boolean;
  currentReport: ReportReference | null;
}

const ReportModalContext = createContext<ModalContext | null>(null);

export const ReportModalProvider = ({ children }: { children: ReactNode }) => {
  const [currentReport, setCurrentReport] = useState<ReportReference | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [onLoadCallback, setOnLoadCallback] = useState<((error?: string | null) => void) | null>(null);

  const open = useCallback((guestReportId: string, onLoad?: (error?: string | null) => void) => {
    if (!guestReportId) return;
    setCurrentReport({ guestReportId });
    if (onLoad) {
      setOnLoadCallback(() => onLoad);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setCurrentReport(null);
    setIsOpen(false);
    setOnLoadCallback(null); // Clear callback on close
  }, []);

  return (
    <ReportModalContext.Provider value={{ open, close, isOpen, currentReport }}>
      {children}
      {isOpen && currentReport && (
        <ReportViewer
          guestReportId={currentReport.guestReportId}
          onBack={close}
          isModal={true}
          onLoad={onLoadCallback || undefined}
        />
      )}
    </ReportModalContext.Provider>
  );
};

export const useReportModal = () => {
  const ctx = useContext(ReportModalContext);
  if (!ctx) {
    throw new Error('useReportModal must be used within a ReportModalProvider');
  }
  return ctx;
}; 