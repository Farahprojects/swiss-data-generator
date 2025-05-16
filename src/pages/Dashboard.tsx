
import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";

// This is a redirector component that forwards to the correct dashboard route
// This helps avoid duplication with the new DashboardLayout used in App.tsx
const Dashboard = () => {
  console.log("Legacy Dashboard.tsx loaded - redirecting to /dashboard");
  
  useEffect(() => {
    console.log("Dashboard redirect effect triggered");
  }, []);
  
  // Redirect to the proper dashboard route that uses the DashboardLayout
  return <Navigate to="/dashboard" replace />;
};

export default Dashboard;
