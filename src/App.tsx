
import React from 'react';
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

function App() {
  return (
    // Changed order: NavigationStateProvider wraps AuthProvider to resolve the dependency issue
    <NavigationStateProvider>
      <AuthProvider>
        <SidebarProvider>
          <Router>
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
              
              {/* Auth redirect page - Accessible on www.theraiastro.com */}
              <Route path="/auth/email" element={<ConfirmEmail />} />
              
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
          </Router>
        </SidebarProvider>
      </AuthProvider>
      <Toaster />
    </NavigationStateProvider>
  );
}

export default App;
