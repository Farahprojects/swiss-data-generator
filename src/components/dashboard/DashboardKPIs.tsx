
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Brain, BookOpen, FileText } from "lucide-react";
import { DashboardKPIs as KPIData } from "@/services/dashboard";

interface DashboardKPIsProps {
  kpis: KPIData;
  loading: boolean;
}

export const DashboardKPIs = ({ kpis, loading }: DashboardKPIsProps) => {
  const kpiItems = [
    {
      title: "Active Clients",
      value: kpis.activeClientsThisWeek,
      icon: Users,
      description: "This week",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Insights Generated",
      value: kpis.insightsGeneratedThisWeek,
      icon: Brain,
      description: "This week",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Journals Received",
      value: kpis.journalsReceivedThisWeek,
      icon: BookOpen,
      description: "This week",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Reports Delivered",
      value: kpis.reportsDeliveredThisWeek,
      icon: FileText,
      description: "This week",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="w-16 h-4 bg-gray-200 rounded"></div>
                  <div className="w-24 h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiItems.map((item, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{item.title}</p>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
