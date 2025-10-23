import React, { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import UserSettings from './pages/UserSettings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Auth from './pages/auth/Auth';
import { AuthGuard } from './components/auth/AuthGuard';
import SubscriptionPaywall from './pages/SubscriptionPaywall';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import Index from './pages/Index';
import Generate from './pages/Generate';
import SystemPrompts from './pages/SystemPrompts';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';
const EmbeddedCheckout = lazy(() => import('./pages/EmbeddedCheckout'));

// This shell contains all routes that can rely on context providers. Providers are now applied at the App root.
const AuthedAppShell: React.FC = () => {
  return (
    <Routes>
      {/* Main public landing page */}
      <Route path="/" element={<Index />} />
      
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/password" element={<Auth />} />
      <Route path="/auth/email" element={<Auth />} />
      
      {/* Main app pages - REQUIRES AUTH */}
      <Route path="/generate" element={<AuthGuard><Generate /></AuthGuard>} />
      <Route path="/prompts" element={<AuthGuard><SystemPrompts /></AuthGuard>} />
      
      {/* Payment/subscription routes */}
      <Route path="/subscription" element={<SubscriptionPaywall />} />
      <Route path="/subscription-paywall" element={<SubscriptionPaywall />} />
      <Route path="/success" element={<SubscriptionSuccess />} />
      <Route path="/cancel" element={<SubscriptionPaywall />} />
      <Route path="/stripe" element={<EmbeddedCheckout />} />
      
      {/* Settings */}
      <Route path="/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
      
      {/* Legal */}
      <Route path="/legal" element={<Legal />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AuthedAppShell;