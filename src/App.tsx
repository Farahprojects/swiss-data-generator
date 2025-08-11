
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from "next-themes";
import { AuthProvider } from './contexts/AuthContext';
import { ModalStateProvider } from './contexts/ModalStateProvider';
import { SettingsModalProvider } from './contexts/SettingsModalContext';
import { PricingProvider } from './contexts/PricingContext';
import NavigationStateProvider from './contexts/NavigationStateContext';
import { ReportModalProvider } from './contexts/ReportModalContext';
import { StripeSuccessProvider } from './contexts/StripeSuccessContext';
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
import ResetPassword from './pages/auth/Password';
import { AuthGuard } from './components/auth/AuthGuard';
import Index from './pages/Index';
import PublicReport from './pages/PublicReport';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';

import SSRErrorBoundary from './components/SSRErrorBoundary';
import Features from './pages/Features';
import WebsiteBuilder from './pages/dashboard/WebsiteBuilder';
import CalendarPage from './pages/dashboard/CalendarPage';
import { PublicCoachWebsite } from './components/website-builder/PublicCoachWebsite';
import PreviewWebsite from './pages/PreviewWebsite';
import { CoachReportPage } from './components/website-builder/CoachReportPage';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import StripeReturn from './pages/StripeReturn';


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
  // Production ready - no environment logging
  }

  // Guard against SSR - only render full app in browser
  if (typeof window === 'undefined') {
    return <div>Loading...</div>;
  }

  // Note: Removed automatic refreshOnce cleanup to preserve state on refresh
  // State should only be cleared by explicit user actions

  return (
    <SSRErrorBoundary>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>
            <Router>
              <NavigationStateProvider>
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
                              <Route path="/report" element={<PublicReport />} />
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
                            <Toaster />
                          </StripeSuccessProvider>
                        </ReportModalProvider>
                      </SettingsModalProvider>
                    </ModalStateProvider>
                  </PricingProvider>
                </AuthProvider>
              </NavigationStateProvider>
            </Router>
            

          </QueryClientProvider>
        </ThemeProvider>
    </SSRErrorBoundary>
  );
}

export default App;
