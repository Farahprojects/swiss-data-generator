import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import MobileLanding from './pages/MobileLanding';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsNativeApp } from '@/hooks/use-native-app';
import SubscriptionPaywall from './pages/SubscriptionPaywall';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import StripeReturn from './pages/StripeReturn';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import ChatContainer from './pages/ChatContainer';
import NotFound from './pages/NotFound';
import NavigationStateProvider from '@/contexts/NavigationStateContext';
import EmbeddedCheckout from './pages/EmbeddedCheckout';
import ThreadSelectionPage from './pages/ThreadSelectionPage';

// Legacy redirect component for /c/g/:threadId -> /g/:threadId
const LegacyGuestRedirect: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  return <Navigate to={`/g/${threadId}`} replace />;
};

// This shell contains all routes that can rely on AuthContext. It is lazy-loaded.
const AuthedAppShell: React.FC = () => {
  // Lightweight trace: mark that authed shell loaded
  if (typeof window !== 'undefined') {
    (window as any).__authTrace = (window as any).__authTrace || { providerMounts: 0, listeners: 0, initialSessionChecks: 0 };
    (window as any).__authTrace.shellLoads = ((window as any).__authTrace.shellLoads || 0) + 1;
  }

  const isMobile = useIsMobile();
  const isNativeApp = useIsNativeApp();

  return (
    <NavigationStateProvider>
      <AuthProvider>
        <ModalStateProvider>
          <SettingsModalProvider>
            <Routes>
              {/* Public routes - redirect authenticated users to chat */}
              <Route path="/" element={<PublicOnlyGuard>{isMobile ? (isNativeApp ? <MobileLanding /> : <ChatContainer />) : <PublicReport />}</PublicOnlyGuard>} />
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
              <Route path="/stripe-return" element={<PublicOnlyGuard><StripeReturn /></PublicOnlyGuard>} />
              <Route path="/stripe" element={<PublicOnlyGuard><EmbeddedCheckout /></PublicOnlyGuard>} />
              
              {/* Guest routes - /g/:chat_id */}
              <Route path="/g/:chatId" element={<ChatContainer />} />
              
              {/* Auth routes - /c/:thread_id */}
              <Route path="/c/:threadId" element={<ChatContainer />} />
              
              {/* Auth thread selection page */}
              <Route path="/therai" element={<AuthGuard><ThreadSelectionPage /></AuthGuard>} />
              
              {/* Legacy redirects */}
              <Route path="/c/g/:threadId" element={<LegacyGuestRedirect />} />
              
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