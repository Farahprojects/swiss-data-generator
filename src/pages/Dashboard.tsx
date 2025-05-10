
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { ApiKeySection } from "@/components/dashboard/ApiKeySection";
import { AiCreditsCard } from "@/components/dashboard/AiCreditsCard";
import { RecentApiCalls } from "@/components/dashboard/RecentApiCalls";
import { BillingSection } from "@/components/dashboard/BillingSection";
import { WebhookLogsViewer } from "@/components/dashboard/WebhookLogsViewer";
import { SwissDebugLogsViewer } from "@/components/dashboard/SwissDebugLogsViewer";
import { useAuth } from "@/contexts/AuthContext";
import ApiDocumentationContent from "@/components/dashboard/ApiDocumentationContent";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />
      
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <div className="flex items-center gap-4">
              <Link to="/dashboard/activity-logs">
                <Button variant="outline" className="flex items-center gap-2">
                  <Activity size={16} />
                  Activity Logs
                </Button>
              </Link>
            </div>
          </div>
          
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              {user?.email?.includes('admin') && (
                <>
                  <TabsTrigger value="webhook-logs">Webhook Logs</TabsTrigger>
                  <TabsTrigger value="swiss-debug-logs">Swiss Debug Logs</TabsTrigger>
                </>
              )}
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ApiKeySection />
                <AiCreditsCard />
              </div>
              <RecentApiCalls />
            </TabsContent>
            
            <TabsContent value="api-keys" className="space-y-6">
              <ApiKeySection />
            </TabsContent>
            
            <TabsContent value="usage" className="space-y-6">
              <RecentApiCalls />
            </TabsContent>
            
            <TabsContent value="docs" className="space-y-6">
              <ApiDocumentationContent />
            </TabsContent>
            
            <TabsContent value="billing" className="space-y-6">
              <BillingSection />
            </TabsContent>

            {user?.email?.includes('admin') && (
              <>
                <TabsContent value="webhook-logs" className="space-y-6">
                  <WebhookLogsViewer />
                </TabsContent>
                
                <TabsContent value="swiss-debug-logs" className="space-y-6">
                  <SwissDebugLogsViewer />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
