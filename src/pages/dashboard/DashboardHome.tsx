
import { AiCreditsCard } from "@/components/dashboard/AiCreditsCard";
import { TopupQueueStatus } from "@/components/dashboard/TopupQueueStatus";
import { WelcomeMessage } from "@/components/dashboard/WelcomeMessage";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

/**
 * Main dashboard overview page - appears at /dashboard
 */
const DashboardHome = () => {
  return (
    <div className="space-y-6">
      <WelcomeMessage />
      
      <QuickStats />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AiCreditsCard />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <TopupQueueStatus />
      </div>
    </div>
  );
};

export default DashboardHome;
