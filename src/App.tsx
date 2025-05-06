
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
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
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { Toaster } from "sonner";
import { toast } from "sonner";

// Payment status handler component
const PaymentStatusHandler = () => {
  const location = useLocation();
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const payment = params.get('payment');
    const amount = params.get('amount');
    
    if (payment === 'success' && amount) {
      toast.success(`Successfully topped up $${amount} in credits!`);
      // Remove the query params to avoid showing the toast again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (payment === 'cancelled') {
      toast.info("Payment was cancelled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (payment === 'setup-success') {
      toast.success("Payment method updated successfully!");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (payment === 'setup-cancelled') {
      toast.info("Payment method update was cancelled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);
  
  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <PaymentStatusHandler />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/api-products" element={<ApiProducts />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
