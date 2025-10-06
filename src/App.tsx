
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AuthedAppShell from '@/AuthedAppShell'
import JoinConversation from '@/pages/JoinConversation'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes - no auth required */}
          <Route path="/join/:chatId" element={<JoinConversation />} />
          
          {/* All other routes go through AuthedAppShell */}
          <Route path="/*" element={<AuthedAppShell />} />
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
