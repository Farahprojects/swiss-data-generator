import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ModalStateProvider } from '@/contexts/ModalStateProvider';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import { ModeProvider } from '@/contexts/ModeContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import UserSettings from './pages/UserSettings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Auth from './pages/auth/Auth';
import { AuthGuard } from './components/auth/AuthGuard';
import { PublicOnlyGuard } from './components/auth/PublicOnlyGuard';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';
import Pricing from './pages/Pricing';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsNativeApp } from '@/hooks/use-native-app';
import SubscriptionPaywall from './pages/SubscriptionPaywall';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import ChatContainer from './pages/ChatContainer';
import NotFound from './pages/NotFound';
import NavigationStateProvider from '@/contexts/NavigationStateContext';
import EmbeddedCheckout from './pages/EmbeddedCheckout';


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
        <SubscriptionProvider>
        <ModalStateProvider>
          <SettingsModalProvider>
            <PricingProvider>
              <ModeProvider>
                <Routes>
              {/* Public routes - redirect authenticated users to chat */}
              <Route path="/" element={<PublicOnlyGuard><ChatContainer /></PublicOnlyGuard>} />
              <Route path="/about" element={<PublicOnlyGuard><About /></PublicOnlyGuard>} />
              <Route path="/contact" element={<PublicOnlyGuard><Contact /></PublicOnlyGuard>} />
              <Route path="/legal" element={<PublicOnlyGuard><Legal /></PublicOnlyGuard>} />
              <Route path="/pricing" element={<PublicOnlyGuard><Pricing /></PublicOnlyGuard>} />
              <Route path="/blog" element={<PublicOnlyGuard><Blog /></PublicOnlyGuard>} />
              <Route path="/blog/:slug" element={<PublicOnlyGuard><BlogPost /></PublicOnlyGuard>} />
              
              {/* Auth routes - redirect authenticated users to chat */}
              <Route path="/login" element={<PublicOnlyGuard><Login /></PublicOnlyGuard>} />
              <Route path="/signup" element={<PublicOnlyGuard><Signup /></PublicOnlyGuard>} />
              <Route path="/" element={<PublicOnlyGuard><Auth /></PublicOnlyGuard>} />
              <Route path="/auth" element={<PublicOnlyGuard><Auth /></PublicOnlyGuard>} />
              <Route path="/auth/password" element={<PublicOnlyGuard><Auth /></PublicOnlyGuard>} />
              <Route path="/auth/email" element={<PublicOnlyGuard><Auth /></PublicOnlyGuard>} />
              
              {/* Payment/subscription routes - redirect authenticated users to chat */}
              <Route path="/subscription" element={<PublicOnlyGuard><SubscriptionPaywall /></PublicOnlyGuard>} />
              <Route path="/subscription-paywall" element={<PublicOnlyGuard><SubscriptionPaywall /></PublicOnlyGuard>} />
              <Route path="/success" element={<PublicOnlyGuard><SubscriptionSuccess /></PublicOnlyGuard>} />
              <Route path="/cancel" element={<PublicOnlyGuard><SubscriptionPaywall /></PublicOnlyGuard>} />
              
              {/* Payment routes - accessible for authenticated users */}
              <Route path="/stripe" element={<EmbeddedCheckout />} />
              
              {/* Auth routes - /c/:thread_id - REQUIRES AUTH */}
              <Route path="/c/:threadId" element={<AuthGuard><ChatContainer /></AuthGuard>} />
              
              {/* Auth clean page - no auto thread creation */}
              <Route path="/therai" element={<AuthGuard><ChatContainer /></AuthGuard>} />
              
              {/* Protected routes */}
              <Route path="/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
              
              {/* 404 - redirect authenticated users to chat */}
              <Route path="*" element={<PublicOnlyGuard><NotFound /></PublicOnlyGuard>} />
                </Routes>
              </ModeProvider>
            </PricingProvider>
          </SettingsModalProvider>
        </ModalStateProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </NavigationStateProvider>
  );
};

export default AuthedAppShell;