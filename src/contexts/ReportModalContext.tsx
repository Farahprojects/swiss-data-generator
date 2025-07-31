import { createContext, useContext, useState, ReactNode } from 'react';
import { ReportData } from '@/utils/reportContentExtraction';

interface ModalState {
  isOpen: boolean;
  data: ReportData | null;
  open: (d: ReportData) => void;
  close: () => void;
}

const Ctx = createContext<ModalState | null>(null);

export const ReportModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setOpen] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);

  // Log context changes
  console.log(`🔄 ReportModalContext: State changed at ${new Date().toISOString()} - isOpen: ${isOpen}, hasData: ${!!data}`);

  const open = (d: ReportData) => { 
    console.log(`🚀 ReportModalContext: open() called at ${new Date().toISOString()}`);
    console.log(`📦 ReportModalContext: data being set:`, d);
    setData(d); 
    setOpen(true); 
    console.log(`✅ ReportModalContext: isOpen set to true at ${new Date().toISOString()}`);
  };
  const close = () => { 
    console.log(`🚀 ReportModalContext: close() called at ${new Date().toISOString()}`);
    setOpen(false); 
    setData(null); 
  };

  return <Ctx.Provider value={{ isOpen, data, open, close }}>{children}</Ctx.Provider>;
};

export const useReportModal = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useReportModal used outside provider');
  return ctx;
}; 