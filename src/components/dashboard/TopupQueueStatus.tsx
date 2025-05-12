
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type TopupRequest = {
  id: string;
  status: string;
  amount_usd: number;
  requested_at: string;
  processed_at: string | null;
  message: string | null;
};

export const TopupQueueStatus = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<TopupRequest[]>([]);

  useEffect(() => {
    const fetchTopupRequests = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("topup_queue")
          .select("*")
          .eq("user_id", user.id)
          .order("requested_at", { ascending: false })
          .limit(5);
        
        if (error) {
          console.error("Error fetching topup requests:", error);
          toast.error("Failed to load auto-topup history");
          return;
        }
        
        // Transform the data to match our expected type
        const typedRequests: TopupRequest[] = (data || []).map(item => ({
          id: item.id,
          status: item.status,
          amount_usd: item.amount_usd,
          requested_at: item.requested_at,
          processed_at: item.processed_at,
          message: item.message
        }));
        
        setRequests(typedRequests);
      } catch (err) {
        console.error("Failed to fetch topup requests:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTopupRequests();
    
    // Set up a real-time subscription for updates
    const subscription = supabase
      .channel('topup-queue-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'topup_queue',
          filter: `user_id=eq.${user?.id}` 
        }, 
        () => {
          fetchTopupRequests();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Skip rendering if there are no requests
  if (requests.length === 0 && !isLoading) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">Failed</Badge>;
      case 'max_retries_reached':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-200">Max Retries</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Auto Top-up History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-md p-3 bg-gray-50">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-medium">${request.amount_usd.toFixed(2)}</span> automatic top-up
                  </div>
                  <div>{getStatusBadge(request.status)}</div>
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  Requested: {new Date(request.requested_at).toLocaleString()}
                </div>
                {request.processed_at && (
                  <div className="text-xs text-gray-500">
                    Processed: {new Date(request.processed_at).toLocaleString()}
                  </div>
                )}
                {request.error_message && (
                  <div className="mt-1 text-xs text-gray-700">
                    <div className="font-medium">Details:</div>
                    <div className="break-all whitespace-pre-wrap">
                      {request.error_message.includes("Payment intent created successfully") ? (
                        <>
                          Payment initiated
                          <div className="mt-1 font-mono text-xs">
                            Intent ID: {request.error_message.replace("Payment intent created successfully: ", "")}
                          </div>
                        </>
                      ) : request.error_message.includes("Checkout session created successfully") ? (
                        <>
                          Payment checkout initiated
                          <div className="mt-1 font-mono text-xs">
                            Session ID: {request.error_message.replace("Checkout session created successfully: ", "")}
                          </div>
                        </>
                      ) : (
                        request.message
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
