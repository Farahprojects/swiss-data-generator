import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type SuccessPayload = {
  jobId?: string;
  guestId?: string;
  email?: string;
  price?: number;
  meta?: Record<string, unknown>;
};

export type SuccessModalAPI = {
  open: (data?: SuccessPayload) => void;    // idempotent
  update: (data: Partial<SuccessPayload>) => void;
  close: () => void;
  isOpen: boolean;
  data: SuccessPayload | null;
};

const Ctx = createContext<SuccessModalAPI | null>(null);

export function SuccessModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [data, setData] = useState<SuccessPayload | null>(null);

  // optional: URL bootstrap
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      const guestId = url.searchParams.get('guest_id') || undefined;
      const success = url.searchParams.get('success');
      if (guestId) setData((d) => ({ ...(d ?? {}), guestId }));
      if (guestId && success === '1') {
        setTimeout(() => setOpen(true), 0);
      }
    } catch {}
  }, []);

  const api = useMemo<SuccessModalAPI>(() => ({
    open: (next) => {
      if (next) setData((d) => ({ ...(d ?? {}), ...next }));
      // write URL flags (optional but recommended)
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (next?.guestId) url.searchParams.set('guest_id', next.guestId);
        url.searchParams.set('success', '1');
        window.history.replaceState(null, '', url);
      }
      setOpen(true);
    },
    update: (next) => setData((d) => ({ ...(d ?? {}), ...next })),
    close: () => {
      setOpen(false);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('success');
        window.history.replaceState(null, '', url);
      }
    },
    isOpen,
    data,
  }), [isOpen, data]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useSuccessModal = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSuccessModal must be used within SuccessModalProvider');
  return ctx;
}; 