
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import "./App.css";

// Public pages
import PublicReport from './pages/PublicReport';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';

import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import StripeReturn from './pages/StripeReturn';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/auth/Password';
import CalendarPage from './pages/dashboard/CalendarPage';
import { AuthGuard } from './components/auth/AuthGuard';
import { PublicOnlyGuard } from './components/auth/PublicOnlyGuard';
import UserSettings from './pages/UserSettings';

// Lazy load chat screen
const ReportChatScreen = lazy(() => import('./screens/ReportChatScreen'));

import { AuthProvider } from './contexts/AuthContext';
import NavigationStateProvider from '@/contexts/NavigationStateContext';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { SettingsModal } from '@/components/settings/SettingsModal';


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


  if (path.startsWith('/report')) {
    // Public report now needs auth-aware UI with navigation
    return (
      <NavigationStateProvider>
        <SettingsModalProvider>
          <AuthProvider>{children}</AuthProvider>
        </SettingsModalProvider>
      </NavigationStateProvider>
    );
  }

  if (path.startsWith('/chat')) {
    // Chat routes need auth-aware providers
    return (
      <NavigationStateProvider>
        <SettingsModalProvider>
          <AuthProvider>{children}</AuthProvider>
        </SettingsModalProvider>
      </NavigationStateProvider>
    );
  }

  // Public pages that still use auth-aware UI
  return (
    <NavigationStateProvider>
      <SettingsModalProvider>
        <AuthProvider>{children}</AuthProvider>
      </SettingsModalProvider>
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
          <ReportModalProvider>
            <ConditionalAuth>
              <div className="min-h-screen bg-background">
                <Routes>
                  {/* Main Routes */}
                  <Route path="/" element={
                    <PublicOnlyGuard>
                      <PublicReport />
                    </PublicOnlyGuard>
                  } />
                  <Route path="/report" element={
                    <PublicOnlyGuard>
                      <PublicReport />
                    </PublicOnlyGuard>
                  } />
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
                  <Route path="/auth" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      {React.createElement(lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage }))))}
                    </Suspense>
                  } />
                  
                  {/* Default authenticated route - redirect to chat */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <AuthGuard>
                        <Navigate to="/chat" replace />
                      </AuthGuard>
                    } 
                  />
                  
                  {/* Auth success redirect to chat */}
                  <Route 
                    path="/auth-success" 
                    element={
                      <AuthGuard>
                        <Navigate to="/chat" replace />
                      </AuthGuard>
                    } 
                  />
                  
                  {/* Protected Calendar Route */}
                  <Route 
                    path="/calendar" 
                    element={
                      <AuthGuard>
                        <CalendarPage />
                      </AuthGuard>
                    } 
                  />

                  {/* Chat Route */}
                  <Route 
                    path="/chat/:chat_id?" 
                    element={
                      <Suspense fallback={<div>Loading Chat...</div>}>
                        <ReportChatScreen />
                      </Suspense>
                    } 
                  />

                  {/* Settings Route */}
                  <Route path="/settings" element={<UserSettings />} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
              <SettingsModal />
              <Toaster />
            </ConditionalAuth>
          </ReportModalProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
