
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { ApiKeySection } from "@/components/dashboard/ApiKeySection";
import { AiCreditsCard } from "@/components/dashboard/AiCreditsCard";
import { RecentApiCalls } from "@/components/dashboard/RecentApiCalls";
import { BillingSection } from "@/components/dashboard/BillingSection";
import { WebhookLogsViewer } from "@/components/dashboard/WebhookLogsViewer";
import { SwissDebugLogsViewer } from "@/components/dashboard/SwissDebugLogsViewer";
import { PricingPage } from "@/components/dashboard/PricingPage";
import { useAuth } from "@/contexts/AuthContext";
import ApiDocumentationContent from "@/components/dashboard/ApiDocumentationContent";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { TopupQueueStatus } from "@/components/dashboard/TopupQueueStatus";

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Memoized function to get tab from URL
  const getTabFromUrl = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get("tab") || "overview";
  }, [location.search]);
  
  // Handle tab changes from URL when component mounts or URL changes
  useEffect(() => {
    const currentTab = getTabFromUrl();
    console.log(`Dashboard: Setting active tab to ${currentTab} from URL`);
    setActiveTab(currentTab);
  }, [location.search, getTabFromUrl]);
  
  const renderContent = () => {
    console.log(`Dashboard: Rendering content for tab: ${activeTab}`);
    
    switch (activeTab) {
      case "usage":
        return <RecentApiCalls />;
      case "docs":
        return <ApiDocumentationContent />;
      case "billing":
        return <BillingSection />;
      case "webhook-logs":
        return <WebhookLogsViewer />;
      case "swiss-debug-logs":
        return <SwissDebugLogsViewer />;
      case "pricing":
        return <PricingPage />;
      case "overview":
      default:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ApiKeySection />
              <AiCreditsCard />
            </div>
            <TopupQueueStatus />
            <RecentApiCalls />
          </div>
        );
    }
  };
  
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
              {renderContent()}
            </div>
          </SidebarInset>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
