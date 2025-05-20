
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import UserSettings from './pages/UserSettings';
import UpgradePlan from './pages/UpgradePlan';
import ApiProducts from './pages/ApiProducts';
import Pricing from './pages/Pricing';
import Documentation from './pages/Documentation';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import PaymentReturn from './pages/PaymentReturn';
import ActivityLogs from './pages/dashboard/ActivityLogs';
import ApiKeys from './pages/dashboard/ApiKeys';
import ApiDocs from './pages/dashboard/ApiDocs';
import UsagePage from './pages/dashboard/UsagePage';
import BillingPage from './pages/dashboard/BillingPage';
import PricingPage from './pages/dashboard/PricingPage';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { Toaster } from "./components/ui/toaster";
import { SidebarProvider } from './components/ui/sidebar';
import NavigationStateProvider from './contexts/NavigationStateContext';
import ConfirmEmail from './pages/auth/ConfirmEmail';
import Password from './pages/auth/Password';
import { detectAndCleanPhantomAuth, forceAuthReset } from './utils/authCleanup';
import { supabase } from './integrations/supabase/client';
import { InlineToast } from './components/ui/InlineToast';
import { logToSupabase } from './utils/batchedLogManager';
import { useBatchedLogging } from './hooks/use-batched-logging';
import { checkForAuthRemnants } from './utils/authCleanup';
import Legal from './pages/Legal';

// Route debugging wrapper with phantom auth detection
const RouteDebugger = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { logAction } = useBatchedLogging();
  
  // Use a reference to track initial load vs subsequent navigations
  const isInitialLoad = React.useRef(true);
  
  useEffect(() => {
    // Batch log route change
    const isAuthRoute = location.pathname.includes('/auth/') || 
                        location.pathname === '/login' || 
                        location.pathname === '/signup';
    
    // Log route info
    logAction('Route change detected', 'info', {
      path: location.pathname,
      search: location.search,
      isAuthRoute,
      isInitialLoad: isInitialLoad.current
    });
    
    // More detailed logging only for auth-related routes or initial load
    if (isAuthRoute || isInitialLoad.current) {
      // Add more detailed logging for recovery tokens
      const searchParams = new URLSearchParams(location.search);
      const isRecoveryFlow = searchParams.get('type') === 'recovery';
      
      if (isRecoveryFlow) {
        logAction('Password recovery flow detected', 'info');
      }
      
      // Check localStorage items only on important routes
      const supabaseItems = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('sb-')
      );
      
      logAction('Auth state check', 'debug', { 
        hasSupabaseItems: supabaseItems.length > 0,
        itemCount: supabaseItems.length 
      });
    }
    
    // Check if we're on a public page that needs phantom auth detection
    const isPublicPage = [
      '/', 
      '/login', 
      '/signup', 
      '/api-products', 
      '/pricing', 
      '/documentation',
      '/about',
      '/contact'
    ].includes(location.pathname) || location.pathname.includes('/auth/password');
    
    if (isPublicPage) {
      logAction('Checking for phantom authentication state', 'debug');
      detectAndCleanPhantomAuth(supabase).then(wasPhantom => {
        if (wasPhantom) {
          logAction('Phantom auth detected and cleaned up', 'warn', {
            path: location.pathname
          });
        } else {
          logAction('No auth remnants found, clean state', 'debug');
        }
      });
      
      // If user is stuck in login loop (e.g., coming back to login repeatedly),
      // perform a stronger reset
      if (location.pathname === '/login' && document.referrer.includes('/login')) {
        logAction('Possible login loop detected, performing stronger reset', 'warn');
        forceAuthReset(supabase);
      }
    }
    
    // Check for password reset flow - if user lands on the homepage with a recovery token in URL
    // This helps catch when Supabase redirects to home instead of /auth/password
    const searchParams = new URLSearchParams(location.search);
    const hasRecoveryToken = searchParams.get('type') === 'recovery';
    if ((location.pathname === '/' || location.pathname === '/login') && hasRecoveryToken) {
      logAction('Detected password recovery flow on wrong page, redirecting to password reset page', 'warn');
      // Use replace instead of href to avoid creating a history entry
      window.location.replace('/auth/password' + location.search);
    }
    
    // After first render, set isInitialLoad to false
    isInitialLoad.current = false;
  }, [location, logAction]);
  
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <NavigationStateProvider>
        <AuthProvider>
          <SidebarProvider>
            <RouteDebugger>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/api-products" element={<ApiProducts />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/payment-return" element={<PaymentReturn />} />
                <Route path="/legal" element={<Legal />} />
                
                {/* Auth routes - Password route is *explicitly* kept outside AuthGuard */}
                <Route path="/auth/email" element={<ConfirmEmail />} />
                <Route path="/auth/password" element={<Password />} />
                {/* Keep backward compatibility with old URL */}
                <Route path="/auth/reset-password" element={<Navigate to="/auth/password" replace />} />
                
                {/* Protected dashboard routes with nested structure */}
                <Route 
                  path="/dashboard" 
                  element={
                    <AuthGuard>
                      <DashboardLayout />
                    </AuthGuard>
                  }
                >
                  <Route index element={<DashboardHome />} />
                  <Route path="settings" element={<UserSettings />} />
                  <Route path="upgrade" element={<UpgradePlan />} />
                  <Route path="activity-logs" element={<ActivityLogs />} />
                  <Route path="api-keys" element={<ApiKeys />} />
                  <Route path="docs" element={<ApiDocs />} />
                  <Route path="usage" element={<UsagePage />} />
                  <Route path="billing" element={<BillingPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouteDebugger>
          </SidebarProvider>
        </AuthProvider>
        <Toaster />
        <InlineToast />
      </NavigationStateProvider>
    </Router>
  );
}

export default App;
