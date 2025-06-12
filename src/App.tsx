
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ModalStateProvider } from './contexts/ModalStateContext';
import { SettingsModalProvider } from './contexts/SettingsModalContext';
import NavigationStateProvider from './contexts/NavigationStateContext';
import { Toaster } from "@/components/ui/toaster";
import "./App.css";
import DashboardLayout from './components/dashboard/DashboardLayout';
import ClientsPage from './pages/dashboard/ClientsPage';
import ClientDetailPage from './pages/dashboard/ClientDetailPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import UserSettings from './pages/UserSettings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { AuthGuard } from './components/auth/AuthGuard';
import Index from './pages/Index';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';
import About from './pages/About';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';

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
            <Router>
              <NavigationStateProvider>
                <div className="min-h-screen bg-background">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/legal" element={<Legal />} />
                    
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    
                    <Route path="/dashboard" element={<AuthGuard><DashboardLayout /></AuthGuard>}>
                      <Route index element={<ClientsPage />} />
                      <Route path="clients" element={<ClientsPage />} />
                      <Route path="clients/:clientId" element={<ClientDetailPage />} />
                      <Route path="reports" element={<ReportsPage />} />
                      <Route path="settings" element={<UserSettings />} />
                    </Route>
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </div>
                <Toaster />
              </NavigationStateProvider>
            </Router>
          </SettingsModalProvider>
        </ModalStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
