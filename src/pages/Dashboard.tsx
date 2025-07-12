
import React from "react";
import { Navigate } from "react-router-dom";
import { logToSupabase } from "@/utils/batchedLogManager";

// This is a redirector component that forwards to the correct dashboard route
const Dashboard = () => {
  logToSupabase("Legacy Dashboard.tsx redirecting to /dashboard", {
    level: 'info',
    page: 'Dashboard'
  });
  
  // Redirect to the proper dashboard route that uses the DashboardLayout
  return <Navigate to="/dashboard" replace />;
};

export default Dashboard;
