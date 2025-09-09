
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Dev-only: suppress noisy Lovable editor console errors (CORS/504 polling)
import { initDevConsoleFilter } from './utils/devConsoleFilter';
// One-time cleanup of old storage keys
import { cleanupOldStorage } from './utils/cleanupOldStorage';

// Force deploy - 2025-06-29
if (typeof window !== 'undefined') {
  // One-time cleanup of old storage keys
  cleanupOldStorage();
  
  if (process.env.NODE_ENV !== 'production') {
    initDevConsoleFilter();
  }
  createRoot(document.getElementById("root")!).render(
    <App />
  );
}
