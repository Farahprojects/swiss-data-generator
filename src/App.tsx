
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AuthedAppShell from '@/AuthedAppShell'
import JoinConversation from '@/pages/JoinConversation'
import { AuthProvider } from '@/contexts/AuthContext'
import NavigationStateProvider from '@/contexts/NavigationStateContext'
import { ModeProvider } from '@/contexts/ModeContext'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes - no auth required but need providers used by chat */}
          <Route path="/join/:chatId" element={
            <NavigationStateProvider>
              <AuthProvider>
                <ModeProvider>
                  <JoinConversation />
                </ModeProvider>
              </AuthProvider>
            </NavigationStateProvider>
          } />
          
          {/* All other routes go through AuthedAppShell */}
          <Route path="/*" element={<AuthedAppShell />} />
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
