import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ModalStateProvider } from './contexts/ModalStateProvider';
import { SettingsModalProvider } from './contexts/SettingsModalContext';
import { PricingProvider } from './contexts/PricingContext';
import { ReportModalProvider } from './contexts/ReportModalContext';
import { StripeSuccessProvider } from './contexts/StripeSuccessContext';
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
import ResetPassword from './pages/auth/Password';
import { AuthGuard } from './components/auth/AuthGuard';
import Index from './pages/Index';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';
import Features from './pages/Features';
import WebsiteBuilder from './pages/dashboard/WebsiteBuilder';
import CalendarPage from './pages/dashboard/CalendarPage';
import { PublicCoachWebsite } from './components/website-builder/PublicCoachWebsite';
import PreviewWebsite from './pages/PreviewWebsite';
import { CoachReportPage } from './components/website-builder/CoachReportPage';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import StripeReturn from './pages/StripeReturn';
import NotFound from './pages/NotFound';

// This shell contains all routes that can rely on AuthContext. It is lazy-loaded.
const AuthedAppShell: React.FC = () => {
  // Lightweight trace: mark that authed shell loaded
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__authTrace = window.__authTrace || { providerMounts: 0, listeners: 0, initialSessionChecks: 0 };
    // @ts-ignore
    window.__authTrace.shellLoads = (window.__authTrace.shellLoads || 0) + 1;
  }

  return (
    <AuthProvider>
      <PricingProvider>
        <ModalStateProvider>
          <SettingsModalProvider>
            <ReportModalProvider>
              <StripeSuccessProvider>
                <div className="min-h-screen bg-background">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/features" element={<Features />} />
                    {/* /report is intentionally excluded to keep it auth-free */}
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/legal" element={<Legal />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    <Route path="/stripe-return" element={<StripeReturn />} />

                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/auth/password" element={<ResetPassword />} />

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
              </StripeSuccessProvider>
            </ReportModalProvider>
          </SettingsModalProvider>
        </ModalStateProvider>
      </PricingProvider>
    </AuthProvider>
  );
};

export default AuthedAppShell;
