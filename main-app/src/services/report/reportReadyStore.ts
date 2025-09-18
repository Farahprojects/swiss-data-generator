import { create } from 'zustand';

const REPORT_READY_KEY = 'therai_report_ready';

interface ErrorState {
  type: string;
  case_number?: string;
  message: string;
  logged_at?: string;
  requires_cleanup?: boolean;
  requires_error_logging?: boolean;
  guest_report_id?: string;
  chat_id?: string;
  email?: string;
}

interface ReportReadyState {
  isPolling: boolean; // Kept for backward compatibility, represents "listening" state
  isReportReady: boolean;
  errorState: ErrorState | null;
  startPolling: () => void; // Now starts listening instead of polling
  stopPolling: () => void;  // Now stops listening instead of polling
  setReportReady: (isReady: boolean) => void;
  setErrorState: (errorState: ErrorState | null) => void;
  // New aliases for clarity
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
}

const getInitialReportReady = (): boolean => {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(REPORT_READY_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

export const useReportReadyStore = create<ReportReadyState>((set, get) => ({
  isPolling: false,
  isReportReady: getInitialReportReady(),
  errorState: null,
  startPolling: () => set({ isPolling: true }),
  stopPolling: () => set({ isPolling: false }),
  setReportReady: (isReady) => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(REPORT_READY_KEY, String(isReady));
      }
    } catch (e) {
      // ignore
    }
    set({ isReportReady: isReady });
  },
  setErrorState: (errorState) => {
    set({ errorState });
  },
  // New aliases for clarity (reference the same state)
  get isListening() { return get().isPolling; },
  startListening: () => set({ isPolling: true }),
  stopListening: () => set({ isPolling: false }),
}));

