import { create } from 'zustand';

const REPORT_READY_KEY = 'therai_report_ready';

interface ReportReadyState {
  isPolling: boolean;
  isReportReady: boolean;
  startPolling: () => void;
  stopPolling: () => void;
  setReportReady: (isReady: boolean) => void;
}

const getInitialReportReady = (): boolean => {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(REPORT_READY_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

export const useReportReadyStore = create<ReportReadyState>((set) => ({
  isPolling: false,
  isReportReady: getInitialReportReady(),
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
}));

