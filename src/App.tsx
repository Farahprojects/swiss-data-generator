
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsModalProvider } from "@/contexts/SettingsModalContext";
import NavigationStateProvider from "@/contexts/NavigationStateContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Suspense, lazy } from "react";
import Index from "./pages/Index";
import Features from "./pages/Features";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import UserSettings from "./pages/UserSettings";
import UpgradePlan from "./pages/UpgradePlan";
import PaymentReturn from "./pages/PaymentReturn";
import ActivityLogs from "./pages/ActivityLogs";
import PasswordReset from "./pages/auth/Password";
import ConfirmEmail from "./pages/auth/ConfirmEmail";
import DashboardLayout from "./components/dashboard/DashboardLayout";

// Lazy load dashboard pages for better performance
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const ClientsPage = lazy(() => import("./pages/dashboard/ClientsPage"));
const ClientDetailPage = lazy(() => import("./pages/dashboard/ClientDetailPage"));
const MessagesPage = lazy(() => import("./pages/dashboard/MessagesPage"));
const MessageDetailPage = lazy(() => import("./pages/dashboard/MessageDetailPage"));
const ReportsPage = lazy(() => import("./pages/dashboard/ReportsPage"));
const CreateReportPage = lazy(() => import("./pages/dashboard/CreateReportPage"));
const UsagePage = lazy(() => import("./pages/dashboard/UsagePage"));
const ApiKeys = lazy(() => import("./pages/dashboard/ApiKeys"));
const BillingPage = lazy(() => import("./pages/dashboard/BillingPage"));
const PricingPage = lazy(() => import("./pages/dashboard/PricingPage"));
const WebsiteBuilder = lazy(() => import("./pages/dashboard/WebsiteBuilder"));
const LandingPageSettings = lazy(() => import("./pages/dashboard/LandingPageSettings"));

import "./App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <NavigationStateProvider>
            <AuthProvider>
              <SettingsModalProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/legal" element={<Legal />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/upgrade-plan" element={<UpgradePlan />} />
                  <Route path="/payment-return" element={<PaymentReturn />} />
                  <Route path="/auth/password" element={<PasswordReset />} />
                  <Route path="/auth/confirm" element={<ConfirmEmail />} />

                  {/* Legacy protected routes */}
                  <Route path="/dashboard-old" element={<AuthGuard><Dashboard /></AuthGuard>} />
                  <Route path="/user-settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
                  <Route path="/activity-logs" element={<AuthGuard><ActivityLogs /></AuthGuard>} />

                  {/* Dashboard routes with proper nested structure */}
                  <Route 
                    path="/dashboard/*" 
                    element={
                      <AuthGuard>
                        <SidebarProvider defaultOpen={true}>
                          <DashboardLayout />
                        </SidebarProvider>
                      </AuthGuard>
                    }
                  >
                    <Route index element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <DashboardHome />
                      </Suspense>
                    } />
                    <Route path="clients" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <ClientsPage />
                      </Suspense>
                    } />
                    <Route path="clients/:id" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <ClientDetailPage />
                      </Suspense>
                    } />
                    <Route path="messages" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <MessagesPage />
                      </Suspense>
                    } />
                    <Route path="messages/:id" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <MessageDetailPage />
                      </Suspense>
                    } />
                    <Route path="reports" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <ReportsPage />
                      </Suspense>
                    } />
                    <Route path="reports/create" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <CreateReportPage />
                      </Suspense>
                    } />
                    <Route path="website-builder" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <WebsiteBuilder />
                      </Suspense>
                    } />
                    <Route path="usage" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <UsagePage />
                      </Suspense>
                    } />
                    <Route path="api-keys" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <ApiKeys />
                      </Suspense>
                    } />
                    <Route path="billing" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <BillingPage />
                      </Suspense>
                    } />
                    <Route path="pricing" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <PricingPage />
                      </Suspense>
                    } />
                    <Route path="landing-page-settings" element={
                      <Suspense fallback={<div>Loading...</div>}>
                        <LandingPageSettings />
                      </Suspense>
                    } />
                  </Route>

                  {/* Catch all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SettingsModalProvider>
            </AuthProvider>
          </NavigationStateProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
