
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Clock, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

interface TopupRequest {
  id: string;
  status: string;
  amount_usd: number;
  requested_at: string;
  processed_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  last_retry_at: string | null;
}

export const TopupQueueStatus = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [topupRequests, setTopupRequests] = useState<TopupRequest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTopupRequests = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("topup_queue")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setTopupRequests(data || []);
    } catch (err) {
      console.error("Error fetching topup requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTopupRequests();
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      fetchTopupRequests();
    }
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case "checkout_created":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Checkout Created</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "max_retries_reached":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300"><AlertCircle className="w-3 h-3 mr-1" />Max Retries Reached</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Auto-Topup Requests</CardTitle>
            <CardDescription>Recent automatic credit topup requests</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : topupRequests.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-12 text-sm font-medium text-gray-500 border-b pb-2">
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-4">Requested</div>
              <div className="col-span-2">Retries</div>
              <div className="col-span-2">Last Try</div>
            </div>
            {topupRequests.map((request) => (
              <div key={request.id} className="grid grid-cols-12 text-sm py-2 border-b last:border-0">
                <div className="col-span-2">{getStatusBadge(request.status)}</div>
                <div className="col-span-2">${request.amount_usd?.toFixed(2)}</div>
                <div className="col-span-4">{formatDate(request.requested_at)}</div>
                <div className="col-span-2">{request.retry_count} of {request.max_retries}</div>
                <div className="col-span-2">{formatDate(request.last_retry_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No auto-topup requests found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
