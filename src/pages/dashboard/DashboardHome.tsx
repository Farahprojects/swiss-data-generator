
import { useState, useEffect } from "react";
import { AiCreditsCard } from "@/components/dashboard/AiCreditsCard";
import { TopupQueueStatus } from "@/components/dashboard/TopupQueueStatus";
import { DashboardKPIs } from "@/components/dashboard/DashboardKPIs";
import { ActionQueue } from "@/components/dashboard/ActionQueue";
import { dashboardService, type DashboardKPIs as KPIData, type ActionItem } from "@/services/dashboard";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

/**
 * Main dashboard overview page - appears at /dashboard
 * Redesigned to focus on actionable insights and client management
 */
const DashboardHome = () => {
  const [kpis, setKpis] = useState<KPIData>({
    activeClientsThisWeek: 0,
    insightsGeneratedThisWeek: 0,
    journalsReceivedThisWeek: 0,
    reportsDeliveredThisWeek: 0,
  });
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [kpisData, actionsData] = await Promise.all([
          dashboardService.getDashboardKPIs(),
          dashboardService.getActionItems(),
        ]);
        
        setKpis(kpisData);
        setActionItems(actionsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [toast]);

  const handleActionClick = (item: ActionItem) => {
    switch (item.type) {
      case 'new_journal':
        // Navigate to client detail with insights tab
        navigate(`/dashboard/clients/${item.clientId}?tab=insights`);
        break;
      case 'quiet_client':
        // Navigate to client detail to send reminder
        navigate(`/dashboard/clients/${item.clientId}?tab=journal`);
        break;
      case 'overdue_report':
        // Navigate to reports page for this client
        navigate(`/dashboard/clients/${item.clientId}?tab=reports`);
        break;
      case 'pending_insight':
        // Navigate to generate insight
        navigate(`/dashboard/clients/${item.clientId}?tab=insights`);
        break;
      default:
        navigate(`/dashboard/clients/${item.clientId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Your coaching practice at a glance</p>
      </div>

      {/* KPIs Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week's Activity</h2>
        <DashboardKPIs kpis={kpis} loading={loading} />
      </section>

      {/* Action Queue - Main Focus */}
      <section>
        <ActionQueue 
          actionItems={actionItems} 
          loading={loading} 
          onActionClick={handleActionClick}
        />
      </section>

      {/* Secondary Information */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account & System</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AiCreditsCard />
          <TopupQueueStatus />
        </div>
      </section>
    </div>
  );
};

export default DashboardHome;
