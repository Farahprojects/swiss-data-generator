
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavigationStateProvider } from "@/contexts/NavigationStateContext";
import { SettingsModalProvider } from "@/contexts/SettingsModalContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import AuthGuard from "@/components/auth/AuthGuard";

// Import pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ApiProducts from "./pages/ApiProducts";
import Pricing from "./pages/Pricing";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";
import Legal from "./pages/Legal";
import ConfirmEmail from "./pages/auth/ConfirmEmail";
import Password from "./pages/auth/Password";
import PaymentReturn from "./pages/PaymentReturn";
import UpgradePlan from "./pages/UpgradePlan";

// Dashboard imports
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import ApiKeys from "./pages/dashboard/ApiKeys";
import ActivityLogs from "./pages/dashboard/ActivityLogs";
import BillingPage from "./pages/dashboard/BillingPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import CreateReportPage from "./pages/dashboard/CreateReportPage";
import ApiDocs from "./pages/dashboard/ApiDocs";
import PricingPage from "./pages/dashboard/PricingPage";
import UsagePage from "./pages/dashboard/UsagePage";
import Dashboard from "./pages/Dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <NavigationStateProvider>
          <SettingsModalProvider>
            <SidebarProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/api-products" element={<ApiProducts />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/legal/*" element={<Legal />} />
                  <Route path="/auth/confirm" element={<ConfirmEmail />} />
                  <Route path="/auth/password" element={<Password />} />
                  <Route path="/payment/return" element={<PaymentReturn />} />
                  <Route path="/upgrade" element={<UpgradePlan />} />
                  
                  {/* Legacy dashboard redirect */}
                  <Route path="/dashboard-legacy" element={<Dashboard />} />
                  
                  {/* Protected dashboard routes */}
                  <Route path="/dashboard" element={
                    <AuthGuard>
                      <DashboardLayout />
                    </AuthGuard>
                  }>
                    <Route index element={<DashboardHome />} />
                    <Route path="api-keys" element={<ApiKeys />} />
                    <Route path="activity-logs" element={<ActivityLogs />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="create-report" element={<CreateReportPage />} />
                    <Route path="docs" element={<ApiDocs />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="usage" element={<UsagePage />} />
                  </Route>
                  
                  {/* Catch all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </SidebarProvider>
          </SettingsModalProvider>
        </NavigationStateProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
