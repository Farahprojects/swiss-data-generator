
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
  id: string;
  plan_type: string;
}

export const CurrentPlanCard = () => {
  const { user } = useAuth();
  
  // Fetch user plan data
  const { data: userPlan } = useQuery<UserPlan>({
    queryKey: ['userPlan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, plan_type')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data as UserPlan;
    },
    enabled: !!user
  });
  
  // Map plan type to display price
  const getPlanPrice = (planType: string) => {
    switch (planType) {
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
        <CardDescription className="capitalize">{userPlan?.plan_type || 'Starter'}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{getPlanPrice(userPlan?.plan_type || 'starter')}/month</p>
        <p className="text-sm text-gray-500 mt-1">Next billing: {getNextBillingDate()}</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">Upgrade Plan</Button>
      </CardFooter>
    </Card>
  );
};
