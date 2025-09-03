import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ReportSlideOver } from '@/components/public-report/ReportSlideOver';

interface ModalContext {
  open: (guestReportId: string, onLoad?: (error?: string | null) => void) => void;
  close: () => void;
  isOpen: boolean;
}

const ReportModalContext = createContext<ModalContext | null>(null);

export const ReportModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [onLoadCallback, setOnLoadCallback] = useState<((error?: string | null) => void) | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [guestReportId, setGuestReportId] = useState<string>('');

  const open = useCallback((guestReportId: string, onLoad?: (error?: string | null) => void) => {
    if (!guestReportId) {
      console.warn('[ReportModal] No guest report ID provided');
      return;
    }
    setGuestReportId(guestReportId);
    if (onLoad) {
      setOnLoadCallback(() => onLoad);
    }
    setIsOpen(true);
    // Only trigger fetch for existing reports, not for 'new' reports
    setShouldFetch(guestReportId !== 'new');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setOnLoadCallback(null); // Clear callback on close
    setShouldFetch(false); // Reset fetch trigger
    setGuestReportId(''); // Clear guest report ID
  }, []);

  return (
    <ReportModalContext.Provider value={{ open, close, isOpen }}>
      {children}
      <ReportSlideOver
        isOpen={isOpen}
        onClose={close}
        onLoad={onLoadCallback || undefined}
        shouldFetch={shouldFetch}
        guestReportId={guestReportId}
      />
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