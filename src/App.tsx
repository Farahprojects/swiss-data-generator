
import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import AuthedAppShell from '@/AuthedAppShell'
import { useEffect } from 'react'

const queryClient = new QueryClient()

function App() {
  // Global hash cleanup - remove Supabase auth hash fragments
  useEffect(() => {
    if (window.location.hash) {
      console.log('🧹 Global hash cleanup:', window.location.hash);
      // Remove hash from URL without triggering navigation
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

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
