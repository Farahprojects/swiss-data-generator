
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Define the FlowRecord interface based on our stripe_flow_tracking table structure
interface FlowRecord {
  id?: string;
  session_id: string;
  flow_state: string;
  plan_type?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
  add_ons?: Record<string, any> | null;
}

export const StripeFlowDebugger = () => {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: flowData, isLoading, refetch } = useQuery<FlowRecord[]>({
    queryKey: ['stripeFlow', user?.id],
    queryFn: async () => {
      if (!user?.email) throw new Error('User not authenticated');
      
      // Use a direct SQL query instead of RPC to avoid TypeScript errors
      const { data, error } = await supabase
        .from('stripe_flow_tracking')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Flow tracking query error:", error);
        throw error;
      }
      
      return data as FlowRecord[];
    },
    enabled: !!user?.email,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getFlowStateDisplay = (state: string) => {
    switch (state) {
      case 'checkout_created':
        return 'Checkout Created';
      case 'payment_verified':
        return 'Payment Verified';
      case 'account_created':
        return 'Account Created';
      case 'account_linked':
        return 'Account Linked';
      default:
        return state;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'checkout_created':
        return 'bg-blue-100 text-blue-800';
      case 'payment_verified':
        return 'bg-yellow-100 text-yellow-800';
      case 'account_created':
        return 'bg-green-100 text-green-800';
      case 'account_linked':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Stripe Flow Status</CardTitle>
        <CardDescription>Debug your payment and account creation flow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Refreshing...
              </>
            ) : 'Refresh'}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !flowData || flowData.length === 0 ? (
          <div className="text-center text-sm text-gray-500 p-4">
            No flow records found for your account
          </div>
        ) : (
          <div className="space-y-4">
            {flowData.map((record, index) => (
              <div key={record.session_id || index} className="border rounded-md p-3 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(record.flow_state)}`}>
                    {getFlowStateDisplay(record.flow_state)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(record.updated_at).toLocaleString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-medium">Plan:</p>
                    <p>{record.plan_type || 'No plan'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Session:</p>
                    <p className="truncate">{record.session_id.substring(0, 10)}...</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
