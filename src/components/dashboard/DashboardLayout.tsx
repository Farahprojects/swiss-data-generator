
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { logToSupabase } from "@/utils/batchedLogManager";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardErrorBoundary } from "@/components/dashboard/DashboardErrorBoundary";
import { SidebarInset } from "@/components/ui/sidebar";

/**
 * Professional DashboardLayout with proper nested routing
 * Provides consistent navigation, sidebar, breadcrumbs, and error handling
 */
const DashboardLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { openSettings } = useSettingsModal();
  
  // Handle settings route redirects
  useEffect(() => {
    const isSettingsRoute = location.pathname.includes('/settings');
    if (isSettingsRoute) {
      const searchParams = new URLSearchParams(location.search);
      const panel = searchParams.get('panel') || 'account';
      
      logToSupabase("Redirecting from settings route to modal", {
        level: 'info',
        page: 'DashboardLayout',
        data: { panel }
      });
      
      openSettings(panel as "account" | "notifications" | "delete" | "support");
    }
  }, [location.pathname, location.search, openSettings]);
  
  useEffect(() => {
    logToSupabase("DashboardLayout mounted", {
      level: 'info',
      page: 'DashboardLayout',
      data: { user: user?.email, path: location.pathname }
    });
  }, [user, location.pathname]);

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Fixed header that spans full width */}
      <UnifiedNavigation />
      
      {/* Main dashboard content with sidebar - no extra padding/margin */}
      <div className="flex flex-1 w-full">
        <DashboardSidebar />
        
        <SidebarInset className="flex flex-col flex-1">
          {/* Main content area with error boundary - no header */}
          <main className="flex-1 p-4 md:p-6">
            <div className="bg-white p-4 md:p-6 w-full min-h-[calc(100vh-120px)]">
              <DashboardErrorBoundary>
                <Outlet />
              </DashboardErrorBoundary>
            </div>
          </main>
        </SidebarInset>
      </div>
    </div>
  );
};

export default DashboardLayout;
