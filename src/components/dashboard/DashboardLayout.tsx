
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { logToSupabase } from "@/utils/batchedLogManager";

/**
 * DashboardLayout serves as the outer shell for all dashboard pages
 * It maintains consistent navigation, sidebar, and footer across all dashboard routes
 */
const DashboardLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { openSettings } = useSettingsModal();
  
  // Check if this is a settings route - handle both new and legacy paths
  const isSettingsRoute = location.pathname.includes('/dashboard/settings') || location.pathname.includes('/settings');
  
  // Get panel from query params
  const searchParams = new URLSearchParams(location.search);
  const panelParam = searchParams.get('panel');
  
  // Handle any redirects to settings
  useEffect(() => {
    if (isSettingsRoute) {
      const panel = panelParam || 'account';
      
      logToSupabase("Redirecting from settings route to modal", {
        level: 'info',
        page: 'DashboardLayout',
        data: { panel }
      });
      
      // Open the settings modal with the specified panel
      openSettings(panel as "account" | "notifications" | "delete" | "support");
      
      // Redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [isSettingsRoute, panelParam, openSettings, navigate]);
  
  useEffect(() => {
    logToSupabase("DashboardLayout mounted or updated", {
      level: 'info',
      page: 'DashboardLayout',
      data: { user: user?.email, path: location.pathname }
    });
  }, [user, location.pathname]);

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Fixed header at the top that spans full width */}
      <div className="sticky top-0 z-50 w-full">
        <UnifiedNavigation />
      </div>
      
      {/* Main content area - flexes below the header */}
      <div className="flex flex-grow bg-gray-50 mt-0 w-full">
        <div className="flex w-full">
          <DashboardSidebar />
          
          <SidebarInset className="p-4 md:p-6 w-full">
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 w-full">
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default DashboardLayout;
