
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// One-time startup check for residual guest_id
try {
  const prevGuestId = typeof window !== 'undefined' ? sessionStorage.getItem('guest_id') : null;
  if (prevGuestId) {
    console.log(`previous guest id found : ${prevGuestId}`);
  }
} catch {}

// Force deploy - 2025-06-29
if (typeof window !== 'undefined') {
  createRoot(document.getElementById("root")!).render(
    <App />
  );
}
