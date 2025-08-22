import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalStateProvider } from '@/contexts/ModalStateProvider';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import UserSettings from './pages/UserSettings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/auth/Password';
import { AuthGuard } from './components/auth/AuthGuard';
import Index from './pages/Index';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';
import Features from './pages/Features';
import CalendarPage from './pages/dashboard/CalendarPage';
import { PublicCoachWebsite } from './components/website-builder/PublicCoachWebsite';
import PreviewWebsite from './pages/PreviewWebsite';
import { CoachReportPage } from './components/website-builder/CoachReportPage';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import StripeReturn from './pages/StripeReturn';
import NotFound from './pages/NotFound';
import NavigationStateProvider from '@/contexts/NavigationStateContext';

// This shell contains all routes that can rely on AuthContext. It is lazy-loaded.
const AuthedAppShell: React.FC = () => {
  // Lightweight trace: mark that authed shell loaded
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__authTrace = window.__authTrace || { providerMounts: 0, listeners: 0, initialSessionChecks: 0 };
    // @ts-ignore
    window.__authTrace.shellLoads = (window.__authTrace.shellLoads || 0) + 1;
  }

  return (
    <NavigationStateProvider>
      <AuthProvider>
        <ModalStateProvider>
          <SettingsModalProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/features" element={<Features />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              
              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/password" element={<ResetPassword />} />
              <Route path="/stripe/return" element={<StripeReturn />} />
              
              {/* Protected routes */}
              <Route path="/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
              
              {/* Website preview routes */}
              <Route path="/coach/:username" element={<PublicCoachWebsite />} />
              <Route path="/coach/:username/report/:reportId" element={<CoachReportPage />} />
              <Route path="/preview" element={<PreviewWebsite />} />
              
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