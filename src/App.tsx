
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UserSettings from './pages/UserSettings';
import UpgradePlan from './pages/UpgradePlan';
import ApiProducts from './pages/ApiProducts';
import Pricing from './pages/Pricing';
import Documentation from './pages/Documentation';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import PaymentReturn from './pages/PaymentReturn';
import ActivityLogs from './pages/ActivityLogs';
import ApiKeysPage from './pages/ApiKeysPage';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { Toaster } from "sonner";
import NavigationStateProvider from './contexts/NavigationStateContext';
import { SidebarProvider } from './components/ui/sidebar';

// RouteHistoryTracker component to track and save route history
// with improved handling for dashboard tabs
const RouteHistoryTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Don't track login, signup, or payment-return pages in history
    const nonTrackableRoutes = ['/login', '/signup', '/payment-return'];
    
    if (nonTrackableRoutes.includes(location.pathname)) {
      return; // Exit early for non-trackable routes
    }
    
    // Special handling for dashboard with tab parameters
    if (location.pathname === '/dashboard') {
      const searchParams = new URLSearchParams(location.search);
      const tab = searchParams.get('tab');
      
      // If we're at the dashboard with a tab parameter, store both
      localStorage.setItem('last_route', location.pathname);
      if (tab) {
        localStorage.setItem('last_route_params', `?tab=${tab}`);
        console.log(`RouteHistoryTracker: Saved dashboard with tab=${tab}`);
      } else {
        localStorage.removeItem('last_route_params');
        console.log('RouteHistoryTracker: Saved dashboard with no tab');
      }
    } else {
      // For other routes, just store the path and clear any params
      localStorage.setItem('last_route', location.pathname);
      localStorage.removeItem('last_route_params');
      console.log(`RouteHistoryTracker: Saved route ${location.pathname}`);
    }
  }, [location.pathname, location.search]);
  
  return null;
};

function AppContent() {
  return (
    <>
      <RouteHistoryTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/api-products" element={<ApiProducts />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/payment-return" element={<PaymentReturn />} />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <AuthGuard>
              <UserSettings />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard/upgrade"
          element={
            <AuthGuard>
              <UpgradePlan />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard/activity-logs"
          element={
            <AuthGuard>
              <ActivityLogs />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard/api-keys"
          element={
            <AuthGuard>
              <ApiKeysPage />
            </AuthGuard>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <NavigationStateProvider>
        <SidebarProvider>
          <Router>
            <AppContent />
          </Router>
        </SidebarProvider>
      </NavigationStateProvider>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
