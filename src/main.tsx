
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Force deploy - 2025-06-29
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
