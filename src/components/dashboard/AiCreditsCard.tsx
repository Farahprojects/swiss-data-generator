
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getProductByName } from "@/utils/stripe-products";

export const AiCreditsCard = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserBalance = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("user_credits")
          .select("balance_usd, last_updated")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user balance:", error);
          return;
        }

        // Set balance to data.balance_usd if available, otherwise 0
        setBalance(data?.balance_usd || 0);
        setLastUpdate(data?.last_updated || null);
      } catch (err) {
        console.error("Failed to fetch user balance:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserBalance();
  }, [user]);

  const handleTopUp = async () => {
    if (!user) {
      toast.error("You must be logged in to top up credits");
      return;
    }

    setIsProcessing(true);
    try {
      // Get the credits top-up product from the database
      const topUpProduct = await getProductByName("API Credits Top-up");
      
      if (!topUpProduct) {
        throw new Error("Could not find top-up product in database");
      }
      
      // Get the current URL path to return to the same page after checkout
      const returnPath = window.location.pathname;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          mode: "payment", 
          amount: topUpProduct.amount_usd,
          priceId: topUpProduct.price_id,
          productId: topUpProduct.product_id,
          successUrl: `${window.location.origin}${returnPath}?payment=success&amount=${topUpProduct.amount_usd}`,
          cancelUrl: `${window.location.origin}${returnPath}?payment=cancelled`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Failed to initiate top-up:", err);
      toast.error("Failed to create checkout session. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Format date to show in the UI
  const formattedLastTopUp = lastUpdate 
    ? new Date(lastUpdate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : "No top-ups yet";

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">API Wallet Balance</CardTitle>
        <CardDescription>Available for API requests</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Balance:</span>
          <span className="text-2xl font-bold">
            ${isLoading ? "..." : balance.toFixed(2)} USD
          </span>
        </div>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>Last Top-Up:</span>
            <span>{formattedLastTopUp}</span>
          </div>
          <div className="flex justify-between">
            <span>Trigger:</span>
            <span>Auto top-up at $5</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button 
          className="w-full bg-white text-black border-black border hover:bg-gray-100"
          onClick={handleTopUp}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Top Up Credits"}
        </Button>
      </CardFooter>
    </Card>
  );
}
