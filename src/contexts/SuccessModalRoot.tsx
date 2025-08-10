import React from 'react';
import { createPortal } from 'react-dom';
import { useSuccessModal } from '@/contexts/SuccessModalContext';
const SuccessScreen = React.lazy(() => import('@/components/public-report/SuccessScreen').then(m => ({ default: m.SuccessScreen })));

export function SuccessModalRoot() {
  const { isOpen } = useSuccessModal();
  if (typeof document === 'undefined' || !isOpen) return null;
  return createPortal(
    <React.Suspense fallback={null}>
      <SuccessScreen />
    </React.Suspense>,
    document.body
  );
} 