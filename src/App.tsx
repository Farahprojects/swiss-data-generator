import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AuthedAppShell from '@/AuthedAppShell'
import { AuthProvider } from '@/contexts/AuthContext'
import NavigationStateProvider from '@/contexts/NavigationStateContext'
import { ModalStateProvider } from '@/contexts/ModalStateProvider'
import { SettingsModalProvider } from '@/contexts/SettingsModalContext'
import { AuthModalProvider } from '@/contexts/AuthModalContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'

const queryClient = new QueryClient()

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <NavigationStateProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <ModalStateProvider>
            <SettingsModalProvider>
              <AuthModalProvider>
                {children}
              </AuthModalProvider>
            </SettingsModalProvider>
          </ModalStateProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </NavigationStateProvider>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppProviders>
          <Routes>
            {/* All routes go through AuthedAppShell */}
            <Route path="/*" element={<AuthedAppShell />} />
          </Routes>
        </AppProviders>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App