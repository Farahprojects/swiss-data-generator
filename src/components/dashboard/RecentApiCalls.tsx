
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
import { useState } from "react";

// Using a mock data interface instead of querying non-existent table
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
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock data instead of querying a non-existent table
  const recentCalls: ApiRequestLog[] = [
    {
      log_id: '1',
      endpoint_called: 'chart',
      system: 'API',
      status: 'success',
      created_at: new Date().toISOString()
    },
    {
      log_id: '2',
      endpoint_called: 'predictions',
      system: 'API',
      status: 'success',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      log_id: '3',
      endpoint_called: 'data',
      system: 'API',
      status: 'error',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      error_message: 'Invalid request parameters'
    }
  ];

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
              {recentCalls.map((call) => (
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
