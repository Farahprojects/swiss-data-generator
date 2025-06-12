import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ModalStateProvider } from './contexts/ModalStateContext';
import { SettingsModalProvider } from './contexts/SettingsModalContext';
import { NavigationStateProvider } from './contexts/NavigationStateContext';
import { Toaster } from "@/components/ui/toaster";
import "./App.css";
import DashboardLayout from './layouts/DashboardLayout';
import ClientsPage from './pages/dashboard/ClientsPage';
import ClientDetailsPage from './pages/dashboard/ClientDetailsPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RequireAuth from './components/auth/RequireAuth';
import PublicRoute from './components/auth/PublicRoute';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import AboutUsPage from './pages/AboutUsPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import NotFoundPage from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ModalStateProvider>
          <SettingsModalProvider>
            <NavigationStateProvider>
              <Router>
                <div className="min-h-screen bg-background">
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/about" element={<AboutUsPage />} />
                    <Route path="/terms" element={<TermsOfServicePage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    
                    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                    <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
                    <Route path="/reset-password/:token" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
                    
                    <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
                      <Route index element={<ClientsPage />} />
                      <Route path="clients" element={<ClientsPage />} />
                      <Route path="clients/:clientId" element={<ClientDetailsPage />} />
                      <Route path="reports" element={<ReportsPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                    </Route>
                    
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </div>
                <Toaster />
              </Router>
            </NavigationStateProvider>
          </SettingsModalProvider>
        </ModalStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
