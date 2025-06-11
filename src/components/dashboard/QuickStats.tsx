
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { clientsService } from "@/services/clients";
import { journalEntriesService } from "@/services/journalEntries";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, TrendingUp, FileText } from "lucide-react";

interface StatsData {
  totalClients: number;
  recentJournalEntries: number;
  activeThisMonth: number;
  reportsGenerated: number;
}

export const QuickStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData>({
    totalClients: 0,
    recentJournalEntries: 0,
    activeThisMonth: 0,
    reportsGenerated: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Get all clients
        const clients = await clientsService.getClients();
        const totalClients = clients.length;

        // Get recent journal entries (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: recentEntries } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('coach_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString());

        // Get clients active this month (with journal entries)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: monthlyEntries } = await supabase
          .from('journal_entries')
          .select('client_id')
          .eq('coach_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        const uniqueActiveClients = new Set(monthlyEntries?.map(entry => entry.client_id) || []).size;

        // Get reports generated this month
        const { data: monthlyReports } = await supabase
          .from('translator_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        setStats({
          totalClients,
          recentJournalEntries: recentEntries?.length || 0,
          activeThisMonth: uniqueActiveClients,
          reportsGenerated: monthlyReports?.length || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const statCards = [
    {
      title: "Total Clients",
      value: stats.totalClients,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Recent Entries",
      value: stats.recentJournalEntries,
      subtitle: "Last 7 days",
      icon: BookOpen,
      color: "text-green-600"
    },
    {
      title: "Active This Month",
      value: stats.activeThisMonth,
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: "Reports Generated",
      value: stats.reportsGenerated,
      subtitle: "This month",
      icon: FileText,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? "..." : stat.value}
            </div>
            {stat.subtitle && (
              <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
