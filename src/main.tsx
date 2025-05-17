
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode temporarily disabled for email verification debugging
createRoot(document.getElementById("root")!).render(
  <App />
);
