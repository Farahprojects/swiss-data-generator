
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import HeaderNavigation from "@/components/HeaderNavigation";
import Footer from "@/components/Footer";
import { ApiKeySection } from "@/components/dashboard/ApiKeySection";
import { CurrentPlanCard } from "@/components/dashboard/CurrentPlanCard";
import { AiCreditsCard } from "@/components/dashboard/AiCreditsCard";
import { RecentApiCalls } from "@/components/dashboard/RecentApiCalls";
import { BillingSection } from "@/components/dashboard/BillingSection";
import { WebhookLogsViewer } from "@/components/dashboard/WebhookLogsViewer";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      <HeaderNavigation />
      
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CurrentPlanCard />
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
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-2xl font-semibold mb-4">Documentation</h2>
                <p className="mb-6">Access comprehensive API documentation and implementation guides.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium mb-2">API Reference</h3>
                    <p className="text-sm text-gray-500 mb-4">Explore endpoints, parameters, and response formats.</p>
                    <Button variant="outline">View API Reference</Button>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Integration Guides</h3>
                    <p className="text-sm text-gray-500 mb-4">Step-by-step guides for implementing our API.</p>
                    <Button variant="outline">View Guides</Button>
                  </div>
                </div>
              </div>
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
