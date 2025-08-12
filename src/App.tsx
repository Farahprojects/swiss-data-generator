
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import "./App.css";

// Public pages
import Index from './pages/Index';
import PublicReport from './pages/PublicReport';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';
import Features from './pages/Features';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import StripeReturn from './pages/StripeReturn';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/auth/Password';
import { PublicCoachWebsite } from './components/website-builder/PublicCoachWebsite';
import PreviewWebsite from './pages/PreviewWebsite';
import { CoachReportPage } from './components/website-builder/CoachReportPage';

import { AuthProvider } from './contexts/AuthContext';
import NavigationStateProvider from './contexts/NavigationStateContext';

// Lazy load the authenticated shell
const AuthedAppShell = lazy(() => import('./AuthedAppShell'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const ConditionalAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;
  const skipAuth = path.startsWith('/report') || path.startsWith('/dashboard');
  return skipAuth ? (
    <>{children}</>
  ) : (
    <NavigationStateProvider>
      <AuthProvider>{children}</AuthProvider>
    </NavigationStateProvider>
  );
};

function App() {
  if (typeof window === 'undefined') {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="light" 
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <Router>
<ConditionalAuth>
            <div className="min-h-screen bg-background">
              <Routes>
                {/* Public Routes */}
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
                <Route path="/preview/:previewId" element={<PreviewWebsite />} />
                <Route path="/:slug/vibe" element={<CoachReportPage />} />
                <Route path="/:slug" element={<PublicCoachWebsite />} />

                {/* Authenticated Routes */}
                <Route 
                  path="/dashboard/*"
                  element={
                    <Suspense fallback={<div>Loading Dashboard...</div>}>
                      <AuthedAppShell />
                    </Suspense>
                  } 
                />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Toaster />
          </ConditionalAuth>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
