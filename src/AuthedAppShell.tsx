import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThreadsProvider } from '@/contexts/ThreadsContext';
import { ModalStateProvider } from '@/contexts/ModalStateProvider';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import { AuthModalProvider } from '@/contexts/AuthModalContext';
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
import Index from './pages/Index';
import MobileLanding from './pages/MobileLanding';
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
        <ThreadsProvider>
          <SubscriptionProvider>
            <ModalStateProvider>
              <SettingsModalProvider>
                <AuthModalProvider>
                  <PricingProvider>
                    <ModeProvider>
                <Routes>
              {/* Main public route - show MobileLanding on mobile, Index on desktop */}
              <Route path="/" element={
                isMobile && !isNativeApp ? <MobileLanding /> : <Index />
              } />
              
              {/* Public routes */}
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              
              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/password" element={<Auth />} />
              <Route path="/auth/email" element={<Auth />} />
              
              {/* Payment/subscription routes */}
              <Route path="/subscription" element={<SubscriptionPaywall />} />
              <Route path="/subscription-paywall" element={<SubscriptionPaywall />} />
              <Route path="/success" element={<SubscriptionSuccess />} />
              <Route path="/cancel" element={<SubscriptionPaywall />} />
              <Route path="/stripe" element={<EmbeddedCheckout />} />
              
              {/* Auth routes - /c/:thread_id - REQUIRES AUTH */}
              <Route path="/c/:threadId" element={<AuthGuard><ChatContainer /></AuthGuard>} />
              
              {/* Auth clean page - no auto thread creation */}
              <Route path="/therai" element={<AuthGuard><ChatContainer /></AuthGuard>} />
              
              {/* Protected routes */}
              <Route path="/settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
                </Routes>
                    </ModeProvider>
                  </PricingProvider>
                </AuthModalProvider>
              </SettingsModalProvider>
            </ModalStateProvider>
          </SubscriptionProvider>
        </ThreadsProvider>
      </AuthProvider>
    </NavigationStateProvider>
  );
};

export default AuthedAppShell;