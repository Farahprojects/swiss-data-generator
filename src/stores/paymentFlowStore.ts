import { create } from 'zustand';

interface PaymentFlowState {
  isPaymentConfirmed: boolean;
  isReportGenerating: boolean;
  isReportReady: boolean;
  error: string | null;
  
  // Actions
  setPaymentConfirmed: (confirmed: boolean) => void;
  setReportGenerating: (generating: boolean) => void;
  setReportReady: (ready: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePaymentFlowStore = create<PaymentFlowState>((set) => ({
  isPaymentConfirmed: false,
  isReportGenerating: false,
  isReportReady: false,
  error: null,
  
  setPaymentConfirmed: (confirmed) => set({ isPaymentConfirmed: confirmed }),
  setReportGenerating: (generating) => set({ isReportGenerating: generating }),
  setReportReady: (ready) => set({ isReportReady: ready }),
  setError: (error) => set({ error }),
  reset: () => set({ 
    isPaymentConfirmed: false, 
    isReportGenerating: false, 
    isReportReady: false, 
    error: null 
  }),
}));
