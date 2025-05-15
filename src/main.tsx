
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Use StrictMode only in development
const StrictModeWrapper = process.env.NODE_ENV === 'development' 
  ? React.StrictMode
  : React.Fragment;

createRoot(document.getElementById("root")!).render(
  <StrictModeWrapper>
    <App />
  </StrictModeWrapper>
);
