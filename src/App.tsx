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

// Route debugging wrapper with phantom auth detection
const RouteDebugger = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  useEffect(() => {
    console.log(`Route changed: ${location.pathname}${location.search}`);
    
    // Add more detailed logging for recovery tokens
    const searchParams = new URLSearchParams(location.search);
    const isRecoveryFlow = searchParams.get('type') === 'recovery';
    
    if (isRecoveryFlow) {
      console.log("Password recovery flow detected with token");
    }
    
    // Check if there are any localStorage items with 'supabase' in their names
    const supabaseItems = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('sb-')
    );
    
    if (supabaseItems.length > 0) {
      console.log("Found Supabase items in localStorage:", supabaseItems);
    } else {
      console.log("No Supabase items found in localStorage");
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
      console.log("On public page, checking for phantom authentication");
      detectAndCleanPhantomAuth(supabase).then(wasPhantom => {
        if (wasPhantom) {
          console.log("Phantom auth was detected and cleaned up");
        }
      });
      
      // If user is stuck in login loop (e.g., coming back to login repeatedly),
      // perform a stronger reset
      if (location.pathname === '/login' && document.referrer.includes('/login')) {
        console.log("Possible login loop detected, performing stronger reset");
        forceAuthReset(supabase);
      }
    }
    
    // Check for password reset flow - if user lands on the homepage with a recovery token in URL
    // This helps catch when Supabase redirects to home instead of /auth/password
    const hasRecoveryToken = searchParams.get('type') === 'recovery';
    if ((location.pathname === '/' || location.pathname === '/login') && hasRecoveryToken) {
      console.log("Detected password recovery flow on wrong page, redirecting to password reset page");
      // Use replace instead of href to avoid creating a history entry
      window.location.replace('/auth/password' + location.search);
    }
  }, [location]);
  
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
