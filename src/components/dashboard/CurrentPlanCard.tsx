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

interface UserPlan {
  plan_name: string;
  api_calls_count: number;
  api_call_limit: number;
}

export const CurrentPlanCard = () => {
  const { user } = useAuth();
  
  // Fetch user plan data from app_users table
  const { data: userPlan } = useQuery<UserPlan>({
    queryKey: ['userPlan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_users')
        .select('plan_name, api_calls_count, api_call_limit')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data as UserPlan;
    },
    enabled: !!user
  });

  // Map plan type to display price
  const getPlanPrice = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'starter':
        return '$19';
      case 'growth':
        return '$49';
      case 'professional':
        return '$79';
      default:
        return '$19';
    }
  };
  
  // Calculate next billing date (demo)
  const getNextBillingDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Current Plan</CardTitle>
        <CardDescription className="capitalize">{userPlan?.plan_name || 'Starter'}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{getPlanPrice(userPlan?.plan_name || 'starter')}/month</p>
        <p className="text-sm text-gray-500 mt-1">Next billing: {getNextBillingDate()}</p>
        <div className="mt-4">
          <p className="text-sm text-gray-500">API Calls: {userPlan?.api_calls_count?.toLocaleString() || '0'} / {userPlan?.api_call_limit?.toLocaleString() || '50,000'}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ 
                width: `${((userPlan?.api_calls_count || 0) / (userPlan?.api_call_limit || 50000) * 100)}%` 
              }}
            ></div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">Upgrade Plan</Button>
      </CardFooter>
    </Card>
  );
};
