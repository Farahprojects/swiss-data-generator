
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AuthedAppShell from '@/AuthedAppShell'
import EmbeddedCheckout from '@/pages/EmbeddedCheckout'
import { AuthGuard } from '@/components/auth/AuthGuard'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Standalone payment page - outside main app layout */}
          <Route path="/stripe" element={<AuthGuard><EmbeddedCheckout /></AuthGuard>} />
          
          {/* All other routes go through AuthedAppShell */}
          <Route path="/*" element={<AuthedAppShell />} />
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
