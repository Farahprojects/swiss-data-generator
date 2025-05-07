
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from '@supabase/supabase-js';
import { toast } from "sonner";

interface WebhookLog {
  id: string;
  stripe_event_id: string;
  stripe_event_type: string;
  stripe_customer_id: string | null;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
}

export const WebhookLogsViewer = () => {
  const { user, supabaseClient } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);

  const fetchWebhookLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from("stripe_webhook_events")
        .select("id, stripe_event_id, stripe_event_type, stripe_customer_id, processed, processing_error, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching webhook logs:", error);
        toast.error("Failed to fetch webhook logs");
        // Show mock data if there's an error
        setLogs([
          {
            id: "1",
            stripe_event_id: "evt_1N4qwXKlGbLr",
            stripe_event_type: "checkout.session.completed",
            stripe_customer_id: "cus_NlG2Wd8k",
            processed: true,
            processing_error: null,
            created_at: new Date().toISOString()
          },
          {
            id: "2",
            stripe_event_id: "evt_2N4qwB7Ju9f",
            stripe_event_type: "invoice.payment_succeeded",
            stripe_customer_id: "cus_M9tK5pR4",
            processed: true,
            processing_error: null,
            created_at: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: "3",
            stripe_event_id: "evt_3P8lsT5KbVj",
            stripe_event_type: "customer.subscription.updated",
            stripe_customer_id: "cus_H7rQ1vL6",
            processed: false,
            processing_error: "Invalid webhook signature",
            created_at: new Date(Date.now() - 7200000).toISOString()
          }
        ]);
      } else {
        setLogs(data || []);
        if (data && data.length === 0) {
          toast.info("No webhook logs found. Make sure webhooks are properly configured in Stripe.");
        }
      }
    } catch (error) {
      console.error("Error in fetchWebhookLogs:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email?.includes('admin')) {
      fetchWebhookLogs();
    }
  }, [user]);

  const handleRefresh = () => {
    fetchWebhookLogs();
  };

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
            onClick={handleRefresh}
            className="mb-4"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Refreshing...
              </>
            ) : 'Refresh Logs'}
          </Button>

          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log) => (
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
                    <p>Customer ID: {log.stripe_customer_id || "N/A"}</p>
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
          ) : (
            <div className="text-center p-4 text-gray-500">
              No webhook events found. Check your Stripe webhook configuration.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
