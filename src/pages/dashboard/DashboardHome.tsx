
import { AiCreditsCard } from "@/components/dashboard/AiCreditsCard";
import { TopupQueueStatus } from "@/components/dashboard/TopupQueueStatus";

/**
 * Main dashboard overview page - appears at /dashboard
 */
const DashboardHome = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <AiCreditsCard />
      </div>
      <TopupQueueStatus />
    </div>
  );
};

export default DashboardHome;
