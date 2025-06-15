
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { logToSupabase } from "@/utils/batchedLogManager";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { DashboardErrorBoundary } from "@/components/dashboard/DashboardErrorBoundary";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Professional DashboardLayout with proper nested routing
 * Provides consistent navigation, sidebar, breadcrumbs, and error handling
 */
const DashboardLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { openSettings } = useSettingsModal();
  
  // Check layout type based on current route
  const isDashboardPageWithBurgerMenu =
    location.pathname === '/dashboard/website-builder' ||
    location.pathname === '/dashboard/messages' ||
    location.pathname === '/dashboard/clients'; // Enable burger menu for clients page always!

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

  // Dashboard pages with burger menu get full width without sidebar (like website builder, messages, clients)
  if (isDashboardPageWithBurgerMenu) {
    // Remove horizontal padding on mobile, restore on md+
    return (
      <div className="min-h-screen flex flex-col w-full">
        <UnifiedNavigation />
        <main className="flex-1 pt-16 px-0 md:px-6">
          <DashboardErrorBoundary>
            <Outlet />
          </DashboardErrorBoundary>
        </main>
      </div>
    );
  }

  // Main dashboard layout with traditional sidebar (wrapped in SidebarProvider)
  // Remove padding on mobile (p-0), restore it on md+ (md:p-4 md:pt-6)
  return (
    <div className="min-h-screen flex flex-col w-full">
      <UnifiedNavigation />
      
      <div className="flex flex-1 w-full pt-16">
        <SidebarProvider defaultOpen={true}>
          <DashboardSidebar />
          
          <SidebarInset className="flex flex-col flex-1">
            <main className="flex-1 p-0 md:p-4 md:pt-6">
              <div className="bg-white p-0 md:p-4 md:p-6 w-full min-h-[calc(100vh-220px)]">
                <DashboardErrorBoundary>
                  <Outlet />
                </DashboardErrorBoundary>
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default DashboardLayout;

