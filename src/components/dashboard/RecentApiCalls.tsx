
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ApiRequestLog {
  log_id: string;
  endpoint_called: string;
  system: string;
  status: string;
  created_at: string;
  error_message?: string;
}

export const RecentApiCalls = () => {
  const { user } = useAuth();
  
  const { data: recentCalls, isLoading } = useQuery<ApiRequestLog[]>({
    queryKey: ['recentApiCalls', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_request_logs')
        .select('log_id, endpoint_called, system, status, created_at, error_message')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent API Calls</CardTitle>
          <CardDescription>Loading recent activity...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent API Calls</CardTitle>
        <CardDescription>View your latest API activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Endpoint</th>
                <th className="text-left py-3 px-4 font-medium">System</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls?.map((call) => (
                <tr key={call.log_id} className="border-b">
                  <td className="py-3 px-4 font-mono capitalize">{call.endpoint_called}</td>
                  <td className="py-3 px-4">{call.system}</td>
                  <td className="py-3 px-4">
                    <span 
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                        call.status === 'success' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                      title={call.error_message || ''}
                    >
                      {call.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {new Date(call.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">View All Activity</Button>
      </CardFooter>
    </Card>
  );
};
