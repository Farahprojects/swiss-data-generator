
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
import { Link } from "react-router-dom";
import { DollarSign } from "lucide-react";

export const CurrentPlanCard = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock user data instead of querying from database
  const userData = {
    id: user?.id || "",
    email: user?.email || "",
    plan_type: "starter",
    api_key: null,
    api_calls_count: 5000,
    calls_limit: 50000,
    status: "active"
  };

  // Mock subscription data
  const subscriptionData = {
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  };

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
    <Card className="flex flex-col h-full overflow-hidden border-2 border-gray-100">
      <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Current Plan
        </CardTitle>
        <CardDescription className="capitalize">{userData?.plan_type || 'Starter'}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-3xl font-bold text-primary">{getPlanPrice(userData?.plan_type || 'starter')}/month</p>
        <p className="text-sm text-gray-500 mt-1">
          Next billing: {subscriptionData?.current_period_end ? new Date(subscriptionData.current_period_end).toLocaleDateString() : getNextBillingDate()}
        </p>
        <div className="mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              API Calls
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {userData?.api_calls_count?.toLocaleString() || '0'} / {userData?.calls_limit?.toLocaleString() || '50,000'}
            </p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ 
                width: `${((userData?.api_calls_count || 0) / (userData?.calls_limit || 50000) * 100)}%` 
              }}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Link to="/dashboard/upgrade" className="w-full">
          <Button variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary/10">Upgrade Plan</Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
