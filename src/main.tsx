
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Use StrictMode only in development
const StrictModeWrapper = import.meta.env.DEV
  ? React.StrictMode
  : React.Fragment;

createRoot(document.getElementById("root")!).render(
  <StrictModeWrapper>
    <App />
  </StrictModeWrapper>
);
