
interface PaymentSessionData {
  sessionId: string;
  planType: string;
  addOns?: string[];
  timestamp: number;
  email?: string;
}

const STORAGE_KEY = 'payment_session';

export const paymentSession = {
  store: (sessionId: string, planType: string, addOns?: string[], email?: string) => {
    const data: PaymentSessionData = {
      sessionId,
      planType,
      addOns,
      timestamp: Date.now(),
      email,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  get: (): PaymentSessionData | null => {
    const data = sessionStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  },

  clear: () => {
    sessionStorage.removeItem(STORAGE_KEY);
  },

  isValid: (sessionId: string): boolean => {
    const data = paymentSession.get();
    if (!data) return false;
    // Sessions are valid for 24 hours
    const isExpired = Date.now() - data.timestamp > 24 * 60 * 60 * 1000;
    return data.sessionId === sessionId && !isExpired;
  }
};
