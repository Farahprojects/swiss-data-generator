import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ReportSlideOver } from '@/components/public-report/ReportSlideOver';

interface ModalContext {
  open: (guestReportId: string, onLoad?: (error?: string | null) => void) => void;
  close: () => void;
  isOpen: boolean;
}

const ReportModalContext = createContext<ModalContext | null>(null);

export const ReportModalProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [onLoadCallback, setOnLoadCallback] = useState<((error?: string | null) => void) | null>(null);
  
  // Get modal state from URL parameters - this automatically persists across refreshes
  const isOpen = searchParams.get('modal') === 'astro';
  const guestReportId = searchParams.get('report_id') || '';
  const shouldFetch = isOpen && guestReportId && guestReportId !== 'new';

  const open = useCallback((guestReportId: string, onLoad?: (error?: string | null) => void) => {
    if (!guestReportId) {
      console.warn('[ReportModal] No guest report ID provided');
      return;
    }
    
    // Update URL parameters to open modal
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('modal', 'astro');
    newSearchParams.set('report_id', guestReportId);
    setSearchParams(newSearchParams);
    
    if (onLoad) {
      setOnLoadCallback(() => onLoad);
    }
  }, [searchParams, setSearchParams]);

  const close = useCallback(() => {
    // Remove modal parameters from URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('modal');
    newSearchParams.delete('report_id');
    setSearchParams(newSearchParams);
    
    setOnLoadCallback(null); // Clear callback on close
  }, [searchParams, setSearchParams]);

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