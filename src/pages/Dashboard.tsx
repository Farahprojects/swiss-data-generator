
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { ApiKeySection } from "@/components/dashboard/ApiKeySection";
import { AiCreditsCard } from "@/components/dashboard/AiCreditsCard";
import { RecentApiCalls } from "@/components/dashboard/RecentApiCalls";
import { BillingSection } from "@/components/dashboard/BillingSection";
import { WebhookLogsViewer } from "@/components/dashboard/WebhookLogsViewer";
import { useAuth } from "@/contexts/AuthContext";
import ApiDocumentationContent from "@/components/dashboard/ApiDocumentationContent";

const Dashboard = () => {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />
      
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
          
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              {user?.email?.includes('admin') && (
                <TabsTrigger value="webhook-logs">Webhook Logs</TabsTrigger>
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
              <TabsContent value="webhook-logs" className="space-y-6">
                <WebhookLogsViewer />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
