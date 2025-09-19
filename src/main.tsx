import React from 'react'
import ReactDOM from 'react-dom/client'

// Simple root component that redirects to the main app
function App() {
  React.useEffect(() => {
    // Redirect to main app by default
    window.location.href = '/main-app/'
  }, [])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div>
        <h1>therai Platform</h1>
        <p>Redirecting to main application...</p>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)