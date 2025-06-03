
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsModalProvider } from "@/contexts/SettingsModalContext";
import NavigationStateProvider from "@/contexts/NavigationStateContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Documentation from "./pages/Documentation";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import UserSettings from "./pages/UserSettings";
import ApiProducts from "./pages/ApiProducts";
import UpgradePlan from "./pages/UpgradePlan";
import PaymentReturn from "./pages/PaymentReturn";
import ActivityLogs from "./pages/ActivityLogs";
import PasswordReset from "./pages/auth/Password";
import ConfirmEmail from "./pages/auth/ConfirmEmail";

// Dashboard Pages
import DashboardHome from "./pages/dashboard/DashboardHome";
import ClientsPage from "./pages/dashboard/ClientsPage";
import ClientDetailPage from "./pages/dashboard/ClientDetailPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import CreateReportPage from "./pages/dashboard/CreateReportPage";
import UsagePage from "./pages/dashboard/UsagePage";
import ApiKeys from "./pages/dashboard/ApiKeys";
import BillingPage from "./pages/dashboard/BillingPage";
import PricingPage from "./pages/dashboard/PricingPage";
import ApiDocs from "./pages/dashboard/ApiDocs";
import WebsiteBuilder from "./pages/dashboard/WebsiteBuilder";

// Dashboard Layout
import DashboardLayout from "./components/dashboard/DashboardLayout";

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
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/api-products" element={<ApiProducts />} />
                  <Route path="/upgrade-plan" element={<UpgradePlan />} />
                  <Route path="/payment-return" element={<PaymentReturn />} />
                  <Route path="/auth/password" element={<PasswordReset />} />
                  <Route path="/auth/confirm" element={<ConfirmEmail />} />

                  {/* Protected routes */}
                  <Route path="/dashboard-old" element={<AuthGuard><Dashboard /></AuthGuard>} />
                  <Route path="/user-settings" element={<AuthGuard><UserSettings /></AuthGuard>} />
                  <Route path="/activity-logs" element={<AuthGuard><ActivityLogs /></AuthGuard>} />

                  {/* Dashboard routes with layout */}
                  <Route path="/dashboard" element={<AuthGuard><DashboardLayout /></AuthGuard>}>
                    <Route index element={<DashboardHome />} />
                    <Route path="clients" element={<ClientsPage />} />
                    <Route path="clients/:id" element={<ClientDetailPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="reports/create" element={<CreateReportPage />} />
                    <Route path="website-builder" element={<WebsiteBuilder />} />
                    <Route path="usage" element={<UsagePage />} />
                    <Route path="api-keys" element={<ApiKeys />} />
                    <Route path="billing" element={<BillingPage />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="api-docs" element={<ApiDocs />} />
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
