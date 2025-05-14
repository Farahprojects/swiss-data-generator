
import { ApiKeySection } from "@/components/dashboard/ApiKeySection";
import { AiCreditsCard } from "@/components/dashboard/AiCreditsCard";
import { RecentApiCalls } from "@/components/dashboard/RecentApiCalls";
import { TopupQueueStatus } from "@/components/dashboard/TopupQueueStatus";

/**
 * Main dashboard overview page - appears at /dashboard
 */
const DashboardHome = () => {
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
};

export default DashboardHome;
