
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ModalStateProvider } from './contexts/ModalStateProvider';
import { SettingsModalProvider } from './contexts/SettingsModalContext';
import { PricingProvider } from './contexts/PricingContext';
import NavigationStateProvider from './contexts/NavigationStateContext';
import { Toaster } from "@/components/ui/toaster";
import "./App.css";
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import ClientsPage from './pages/dashboard/ClientsPage';
import ClientDetailPage from './pages/dashboard/ClientDetailPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import MessagesPage from './pages/dashboard/MessagesPage';
import CreateReportPage from './pages/dashboard/CreateReportPage';
import UserSettings from './pages/UserSettings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { AuthGuard } from './components/auth/AuthGuard';
import Index from './pages/Index';
import PublicReport from './pages/PublicReport';
import PaymentReturn from './pages/PaymentReturn';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import SSRErrorBoundary from './components/SSRErrorBoundary';
import Features from './pages/Features';
import WebsiteBuilder from './pages/dashboard/WebsiteBuilder';
import CalendarPage from './pages/dashboard/CalendarPage';
import { PublicCoachWebsite } from './components/website-builder/PublicCoachWebsite';
import PreviewWebsite from './pages/PreviewWebsite';
import { CoachReportPage } from './components/website-builder/CoachReportPage';

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
  // SSR Environment Detection
  if (typeof window === 'undefined') {
    console.log('[🧠 SSR ENVIRONMENT DETECTED]');
    console.log('[🧠 SSR] App.tsx is rendering on server');
  } else {
    console.log('[🌐 CLIENT ENVIRONMENT DETECTED]');
  }

  // Guard against SSR - only render full app in browser
  if (typeof window === 'undefined') {
    return <div>Loading...</div>;
  }

  return (
    <SSRErrorBoundary>
      <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <NavigationStateProvider>
            <AuthProvider>
              <PricingProvider>
                <ModalStateProvider>
                  <SettingsModalProvider>
                  <div className="min-h-screen bg-background">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/report" element={<PublicReport />} />
                      <Route path="/payment-return" element={<PaymentReturn />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/legal" element={<Legal />} />
                      
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      
                      {/* Preview route for website builder */}
                      <Route path="/preview/:previewId" element={<PreviewWebsite />} />
                      
                      <Route path="/dashboard" element={<AuthGuard><DashboardLayout /></AuthGuard>}>
                        <Route index element={<DashboardHome />} />
                        <Route path="calendar" element={<CalendarPage />} />
                        <Route path="clients" element={<ClientsPage />} />
                        <Route path="clients/:clientId" element={<ClientDetailPage />} />
                        <Route path="reports" element={<ReportsPage />} />
                        <Route path="reports/create" element={<CreateReportPage />} />
                        <Route path="messages" element={<MessagesPage />} />
                        <Route path="settings" element={<UserSettings />} />
                        <Route path="website-builder" element={<WebsiteBuilder />} />
                      </Route>
                      
                      {/* Coach report page route */}
                      <Route path="/:slug/vibe" element={<CoachReportPage />} />
                      
                      {/* Dynamic slug route for published coach websites - moved before catch-all */}
                      <Route path="/:slug" element={<PublicCoachWebsite />} />
                      
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                    <Toaster />
                  </SettingsModalProvider>
                </ModalStateProvider>
              </PricingProvider>
            </AuthProvider>
          </NavigationStateProvider>
        </Router>
      </QueryClientProvider>
      </ErrorBoundary>
    </SSRErrorBoundary>
  );
}

export default App;
