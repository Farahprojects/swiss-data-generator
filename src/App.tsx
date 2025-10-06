
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AuthedAppShell from '@/AuthedAppShell'
import JoinConversation from '@/pages/JoinConversation'
import { AuthProvider } from '@/contexts/AuthContext'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes - no auth required but need AuthProvider */}
          <Route path="/join/:chatId" element={
            <AuthProvider>
              <JoinConversation />
            </AuthProvider>
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
