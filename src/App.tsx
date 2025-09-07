
import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AuthedAppShell from '@/AuthedAppShell'
import { LogoProcessor } from '@/components/LogoProcessor'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthedAppShell />
        <LogoProcessor />
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
