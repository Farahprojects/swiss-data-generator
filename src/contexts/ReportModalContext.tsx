import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ReportViewer } from '@/components/public-report/ReportViewer';
import { getChatTokens } from '@/services/auth/chatTokens';

interface ModalContext {
  open: (onLoad?: (error?: string | null) => void) => void;
  close: () => void;
  isOpen: boolean;
}

const ReportModalContext = createContext<ModalContext | null>(null);

export const ReportModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [onLoadCallback, setOnLoadCallback] = useState<((error?: string | null) => void) | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);

  const open = useCallback((onLoad?: (error?: string | null) => void) => {
    const { uuid } = getChatTokens();
    if (!uuid) {
      console.warn('[ReportModal] No persisted guest ID found');
      return;
    }
    if (onLoad) {
      setOnLoadCallback(() => onLoad);
    }
    setIsOpen(true);
    setShouldFetch(true); // Trigger fetch when modal opens
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setOnLoadCallback(null); // Clear callback on close
    setShouldFetch(false); // Reset fetch trigger
  }, []);

  return (
    <ReportModalContext.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && (
        <ReportViewer
          onBack={close}
          isModal={true}
          onLoad={onLoadCallback || undefined}
          shouldFetch={shouldFetch}
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