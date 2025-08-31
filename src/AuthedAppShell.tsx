import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalStateProvider } from '@/contexts/ModalStateProvider';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import UserSettings from './pages/UserSettings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/auth/Password';
import ConfirmEmail from './pages/auth/ConfirmEmail';
import EmailVerification from './pages/auth/EmailVerification';
import { AuthGuard } from './components/auth/AuthGuard';
import PublicReport from './pages/PublicReport';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';

import CalendarPage from './pages/dashboard/CalendarPage';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import StripeReturn from './pages/StripeReturn';
import NotFound from './pages/NotFound';
import NavigationStateProvider from '@/contexts/NavigationStateContext';

// This shell contains all routes that can rely on AuthContext. It is lazy-loaded.
const AuthedAppShell: React.FC = () => {
  // Lightweight trace: mark that authed shell loaded
  if (typeof window !== 'undefined') {
    (window as any).__authTrace = (window as any).__authTrace || { providerMounts: 0, listeners: 0, initialSessionChecks: 0 };
    (window as any).__authTrace.shellLoads = ((window as any).__authTrace.shellLoads || 0) + 1;
  }

  return (
    <NavigationStateProvider>
      <AuthProvider>
        <ModalStateProvider>
          <SettingsModalProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<PublicReport />} />
              <Route path="/pricing" element={<Pricing />} />

              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              
              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/password" element={<ResetPassword />} />
              <Route path="/auth/email" element={<ConfirmEmail />} />
              <Route path="/auth/email-verification" element={<EmailVerification />} />
              <Route path="/stripe/return" element={<StripeReturn />} />
              
              {/* Protected routes */}
              <Route path="/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SettingsModalProvider>
        </ModalStateProvider>
      </AuthProvider>
    </NavigationStateProvider>
  );
};

export default AuthedAppShell;