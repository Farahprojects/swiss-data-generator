
import { AiCreditsCard } from "@/components/dashboard/AiCreditsCard";
import { TopupQueueStatus } from "@/components/dashboard/TopupQueueStatus";
import { WelcomeMessage } from "@/components/dashboard/WelcomeMessage";
import { QuickStats } from "@/components/dashboard/QuickStats";

/**
 * Main dashboard overview page - appears at /dashboard
 */
const DashboardHome = () => {
  return (
    <div className="space-y-6">
      <WelcomeMessage />
      
      <QuickStats />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AiCreditsCard />
        <TopupQueueStatus />
      </div>
    </div>
  );
};

export default DashboardHome;
