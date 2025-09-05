
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AudioCaptureManager } from '@/services/voice/AudioCaptureManager';
import './index.css';

// Dev-only: suppress noisy Lovable editor console errors (CORS/504 polling)
import { initDevConsoleFilter } from './utils/devConsoleFilter';

// Force deploy - 2025-06-29
if (typeof window !== 'undefined') {
  if (process.env.NODE_ENV !== 'production') {
    initDevConsoleFilter();
  }
  try { AudioCaptureManager.initializeOnce(); } catch {}
  createRoot(document.getElementById("root")!).render(
    <App />
  );
}
