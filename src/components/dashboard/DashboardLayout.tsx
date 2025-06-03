
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { logToSupabase } from "@/utils/batchedLogManager";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { DashboardErrorBoundary } from "@/components/dashboard/DashboardErrorBoundary";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

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
      {/* Fixed header that doesn't need a container - it's positioned fixed */}
      <UnifiedNavigation />
      
      {/* Main dashboard content with sidebar - positioned below fixed header */}
      <div className="flex flex-1 w-full">
        <DashboardSidebar />
        
        <SidebarInset className="flex flex-col flex-1">
          {/* Dashboard header with breadcrumbs and trigger */}
          <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b bg-white">
            <SidebarTrigger className="-ml-1" />
            <DashboardBreadcrumb />
          </header>
          
          {/* Main content area with error boundary */}
          <main className="flex-1 p-4 md:p-6">
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 w-full min-h-[calc(100vh-200px)]">
              <DashboardErrorBoundary>
                <Outlet />
              </DashboardErrorBoundary>
            </div>
          </main>
        </SidebarInset>
      </div>
      
      <Footer />
    </div>
  );
};

export default DashboardLayout;
