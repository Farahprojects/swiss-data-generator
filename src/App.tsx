
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UserSettings from './pages/UserSettings';
import UpgradePlan from './pages/UpgradePlan';
import ApiProducts from './pages/ApiProducts';
import Pricing from './pages/Pricing';
import Documentation from './pages/Documentation';
import About from './pages/About';
import Contact from './pages/Contact';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { Toaster } from "sonner";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/api-products" element={<ApiProducts />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <AuthGuard>
                <UserSettings />
              </AuthGuard>
            }
          />
          <Route
            path="/dashboard/upgrade"
            element={
              <AuthGuard>
                <UpgradePlan />
              </AuthGuard>
            }
          />
        </Routes>
      </Router>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
