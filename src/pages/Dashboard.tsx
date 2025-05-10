
import { useEffect, useState } from "react";
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

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  useEffect(() => {
    // Get the active tab from URL parameters
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    } else {
      setActiveTab("overview");
    }
  }, [location]);
  
  const renderContent = () => {
    switch (activeTab) {
      case "api-keys":
        return <ApiKeySection />;
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
            <RecentApiCalls />
          </div>
        );
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Fixed header at the top */}
      <div className="sticky top-0 z-50">
        <UnifiedNavigation />
      </div>
      
      {/* Main content area - flexes below the header */}
      <div className="flex flex-grow bg-gray-50 mt-0">
        <div className="flex w-full">
          <DashboardSidebar />
          
          <SidebarInset className="p-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
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
