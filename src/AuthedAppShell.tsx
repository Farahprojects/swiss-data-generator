import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalStateProvider } from '@/contexts/ModalStateProvider';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import { PricingProvider } from '@/contexts/PricingContext';
import UserSettings from './pages/UserSettings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/auth/Password';
import ConfirmEmail from './pages/auth/ConfirmEmail';
import { AuthGuard } from './components/auth/AuthGuard';
import { PublicOnlyGuard } from './components/auth/PublicOnlyGuard';
import PublicReport from './pages/PublicReport';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';
import SubscriptionPaywall from './pages/SubscriptionPaywall';
import SubscriptionSuccess from './pages/SubscriptionSuccess';


import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import StripeReturn from './pages/StripeReturn';
import ReportChatScreen from './screens/ReportChatScreen';
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
              {/* Public routes - redirect authenticated users to chat */}
              <Route path="/" element={<PublicOnlyGuard><PublicReport /></PublicOnlyGuard>} />
              <Route path="/pricing" element={<PublicOnlyGuard><PricingProvider><Pricing /></PricingProvider></PublicOnlyGuard>} />
              <Route path="/about" element={<PublicOnlyGuard><About /></PublicOnlyGuard>} />
              <Route path="/contact" element={<PublicOnlyGuard><Contact /></PublicOnlyGuard>} />
              <Route path="/legal" element={<PublicOnlyGuard><Legal /></PublicOnlyGuard>} />
              <Route path="/blog" element={<PublicOnlyGuard><Blog /></PublicOnlyGuard>} />
              <Route path="/blog/:slug" element={<PublicOnlyGuard><BlogPost /></PublicOnlyGuard>} />
              
              {/* Auth routes - redirect authenticated users to chat */}
              <Route path="/login" element={<PublicOnlyGuard><Login /></PublicOnlyGuard>} />
              <Route path="/signup" element={<PublicOnlyGuard><Signup /></PublicOnlyGuard>} />
              <Route path="/auth/password" element={<PublicOnlyGuard><ResetPassword /></PublicOnlyGuard>} />
              <Route path="/auth/email" element={<PublicOnlyGuard><ConfirmEmail /></PublicOnlyGuard>} />
              
              {/* Payment/subscription routes - redirect authenticated users to chat */}
              <Route path="/subscription" element={<PublicOnlyGuard><SubscriptionPaywall /></PublicOnlyGuard>} />
              <Route path="/subscription-paywall" element={<PublicOnlyGuard><SubscriptionPaywall /></PublicOnlyGuard>} />
              <Route path="/success" element={<PublicOnlyGuard><SubscriptionSuccess /></PublicOnlyGuard>} />
              <Route path="/cancel" element={<PublicOnlyGuard><SubscriptionPaywall /></PublicOnlyGuard>} />
              <Route path="/stripe/return" element={<PublicOnlyGuard><StripeReturn /></PublicOnlyGuard>} />
              
              {/* Chat routes - accessible to both authenticated and guest users */}
              <Route path="/chat" element={<ReportChatScreen />} />
              <Route path="/chat/:chat_id" element={<ReportChatScreen />} />
              
              {/* Protected routes */}
              <Route path="/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
              
              {/* 404 - redirect authenticated users to chat */}
              <Route path="*" element={<PublicOnlyGuard><NotFound /></PublicOnlyGuard>} />
            </Routes>
          </SettingsModalProvider>
        </ModalStateProvider>
      </AuthProvider>
    </NavigationStateProvider>
  );
};

export default AuthedAppShell;