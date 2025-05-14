
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
// Remove the import for getStripeLinkByName since it no longer exists
import { storeStripeReturnPath } from "@/utils/stripe-links";

export const BillingPanel = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from("user_credits")
          .select("balance_usd")
          .eq("user_id", user.id)
          .single();
          
        if (error) {
          console.error("Error fetching balance:", error);
          return;
        }
        
        setBalance(data?.balance_usd || 0);
      } catch (err) {
        console.error("Failed to fetch balance:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBalance();
  }, [user]);
  
  const handleTopUp = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to top up credits",
        variant: "destructive"
      });
      return;
    }
    
    setIsTopUpLoading(true);
    try {
      // Store the current path for return
      storeStripeReturnPath(window.location.pathname);
      
      // Use the create-checkout edge function instead of links
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          mode: "payment",
          amount: 10, // Default amount or use a product lookup
          returnPath: window.location.pathname
        }
      });
      
      if (error || !data?.url) {
        console.error("Error creating checkout session:", error);
        toast({
          title: "Error",
          description: "Failed to create checkout session. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("Failed to top up:", err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsTopUpLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <CreditCard className="h-5 w-5" />
          Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-6 bg-gray-300 rounded w-32"></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-500">Your Current Balance</div>
            <div className="text-xl font-bold">${balance.toFixed(2)}</div>
          </div>
        )}
        
        <Button 
          onClick={handleTopUp} 
          disabled={isTopUpLoading}
          className="mt-4"
        >
          {isTopUpLoading ? "Processing..." : "Top Up Credits"}
        </Button>
      </CardContent>
    </Card>
  );
};
