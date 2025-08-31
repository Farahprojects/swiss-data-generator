
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { NavigationStateProvider } from "@/contexts/NavigationStateContext";
import { SettingsModalProvider } from "@/contexts/SettingsModalContext";
import { ThemeProvider } from "next-themes";
import GuestAppShell from "./GuestAppShell";
import AuthedAppShell from "./AuthedAppShell";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

function AppContent() {
  const { user } = useAuth();
  
  return user ? <AuthedAppShell /> : <GuestAppShell />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <Router>
          <NavigationStateProvider>
            <AuthProvider>
              <ProfileProvider>
                <SettingsModalProvider>
                  <div className="min-h-screen bg-background font-sans antialiased">
                    <AppContent />
                    <Toaster />
                  </div>
                </SettingsModalProvider>
              </ProfileProvider>
            </AuthProvider>
          </NavigationStateProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
