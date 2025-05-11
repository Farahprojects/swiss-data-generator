
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define the structure of the API activity log entry (same as ActivityLogs.tsx)
type ActivityLog = {
  id: string;
  created_at: string;
  response_status: number;
  request_type: string;
  endpoint?: string;
  report_tier: string | null;
  total_cost_usd: number;
  processing_time_ms: number | null;
  response_payload?: any;
  request_payload?: any;
  error_message?: string;
  google_geo?: boolean;
};

export const RecentApiCalls = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Function to load logs from the database - simplified version for recent calls
  const loadLogs = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('translator_logs')
        .select(`
          *,
          api_usage!translator_log_id(total_cost_usd)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4); // Only get the 4 most recent logs
      
      if (error) {
        console.error("Error fetching logs:", error);
        return;
      }

      // Process the data to match the ActivityLog type (same as ActivityLogs.tsx)
      const processedData: ActivityLog[] = data?.map(item => {
        return {
          id: item.id,
          created_at: item.created_at,
          response_status: item.response_status || 0,
          endpoint: item.request_type || 'unknown',
          request_type: item.request_type || '',
          report_tier: item.report_tier,
          total_cost_usd: item.api_usage?.[0]?.total_cost_usd || 0,
          processing_time_ms: item.processing_time_ms,
          response_payload: item.response_payload,
          request_payload: item.request_payload,
          error_message: item.error_message,
          google_geo: item.google_geo
        };
      }) || [];
      
      setLogs(processedData);
    } catch (err) {
      console.error("Unexpected error loading logs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load logs when component mounts
  useEffect(() => {
    loadLogs();
  }, [user]);

  const handleViewAllActivity = () => {
    navigate('/dashboard/activity-logs');
  };

  // Format the type value with proper capitalization and consistent display - same as ActivityLogs
  const formatTypeValue = (type: string | null): string => {
    if (!type) return 'None';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };

  // Helper function to check if a log is failed - same as ActivityLogs
  const isFailedLog = (status: number): boolean => {
    return status >= 400;
  };

  // Render status icon with tooltip - same as ActivityLogs
  const renderStatusIcon = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                <Check className="h-4 w-4 text-green-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-white">
              <p>Success</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
                <X className="h-4 w-4 text-red-600" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-white">
              <p>Failed</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  };

  if (loading) {
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
        {logs.length === 0 ? (
          <div className="text-center py-4">
            <p>No activity logs found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase text-gray-500">Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-500">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-500">Type</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-gray-500 text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <TableRow 
                  key={log.id} 
                  className="hover:bg-gray-50 transition-colors"
                >
                  <TableCell className="py-3 text-sm">
                    {log.created_at ? 
                      format(new Date(log.created_at), 'MMM d, yyyy') : 
                      'N/A'}
                  </TableCell>
                  <TableCell className="py-3">
                    {renderStatusIcon(log.response_status)}
                  </TableCell>
                  <TableCell className="py-3">
                    {isFailedLog(log.response_status) ? (
                      <span className="text-gray-500 text-sm">None</span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {formatTypeValue(log.request_type)}
                        </span>
                        {log.report_tier && (
                          <span className="text-xs text-primary">
                            {formatTypeValue(log.report_tier)}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right text-sm">
                    ${log.total_cost_usd?.toFixed(2) || '0.00'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleViewAllActivity}
        >
          View All Activity
        </Button>
      </CardFooter>
    </Card>
  );
};
