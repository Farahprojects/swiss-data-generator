
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface WebhookLog {
  id: string;
  stripe_event_id: string;
  stripe_event_type: string;
  stripe_customer_id: string;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
}

export const WebhookLogsViewer = () => {
  const { user } = useAuth();

  const { data: logs, isLoading, refetch } = useQuery<WebhookLog[]>({
    queryKey: ['webhookLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: user?.email?.includes('admin')
  });

  if (!user?.email?.includes('admin')) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Logs</CardTitle>
        <CardDescription>Recent Stripe webhook events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="mb-4"
          >
            Refresh Logs
          </Button>

          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {logs?.map((log) => (
                <div 
                  key={log.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{log.stripe_event_type}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p>Event ID: {log.stripe_event_id}</p>
                    <p>Customer ID: {log.stripe_customer_id}</p>
                    <p className={`${log.processed ? 'text-green-600' : 'text-yellow-600'}`}>
                      Status: {log.processed ? 'Processed' : 'Pending'}
                    </p>
                    {log.processing_error && (
                      <p className="text-red-600">
                        Error: {log.processing_error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
