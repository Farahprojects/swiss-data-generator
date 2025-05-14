
import { RecentApiCalls } from "@/components/dashboard/RecentApiCalls"; 

const ActivityLogs = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Activity Logs</h1>
      <RecentApiCalls />
    </div>
  );
};

export default ActivityLogs;
