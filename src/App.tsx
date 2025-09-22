
import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AuthedAppShell from '@/AuthedAppShell'
import { testEnvironmentVariables } from '@/utils/env-test'

const queryClient = new QueryClient()

// Test environment variables on app load
testEnvironmentVariables()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthedAppShell />
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
