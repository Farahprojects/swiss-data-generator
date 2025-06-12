
import { useAuth } from "@/contexts/AuthContext";

/**
 * Main dashboard overview page - appears at /dashboard
 */
const DashboardHome = () => {
  const { user } = useAuth();
  
  const firstName = user?.email?.split('@')[0] || 'there';
  
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Hello {firstName}! 👋
        </h1>
        <p className="text-lg text-muted-foreground">
          Welcome to your dashboard
        </p>
      </div>
    </div>
  );
};

export default DashboardHome;
