
import { Outlet } from "react-router-dom";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { SidebarInset } from "@/components/ui/sidebar";

/**
 * DashboardLayout serves as the outer shell for all dashboard pages
 * It maintains consistent navigation, sidebar, and footer across all dashboard routes
 */
const DashboardLayout = () => {
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
