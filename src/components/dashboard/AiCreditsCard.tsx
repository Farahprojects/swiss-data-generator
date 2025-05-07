
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
import { getProductByType } from "@/utils/stripe-products";

export const AiCreditsCard = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [creditProduct, setCreditProduct] = useState<{ price_id: string; amount_usd: number } | null>(null);

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

  // Load the API credits product
  useEffect(() => {
    const fetchCreditProduct = async () => {
      try {
        const products = await getProductByType('credit');
        
        if (products && products.length > 0) {
          const product = products[0]; // Take the first credit product
          setCreditProduct({
            price_id: product.price_id,
            amount_usd: product.amount_usd
          });
          console.log("Found credit product:", product);
        } else {
          console.warn("No active credit products found in the database");
        }
      } catch (err) {
        console.error("Failed to fetch credit product:", err);
      }
    };

    fetchCreditProduct();
  }, []);

  const handleTopUp = async () => {
    if (!user) {
      toast.error("You must be logged in to top up credits");
      return;
    }

    if (!creditProduct?.price_id) {
      toast.error("No credit product available. Please contact support.");
      return;
    }

    setIsProcessing(true);
    try {
      console.log("Creating checkout session with price ID:", creditProduct.price_id);
      
      // Use the create-checkout edge function to create a dynamic checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          mode: "payment",
          priceId: creditProduct.price_id,
          amount: creditProduct.amount_usd,
          successUrl: `${window.location.origin}/dashboard?payment=success&amount=${creditProduct.amount_usd}`,
          cancelUrl: `${window.location.origin}/dashboard?payment=cancelled`,
          customAppearance: {
            primaryColor: "#6941C6",
            buttonColor: "#6941C6",
            brandName: "AstroGPT API",
            logo: `${window.location.origin}/logo.png`
          }
        }
      });

      if (error || !data?.url) {
        console.error("Error creating checkout session:", error);
        toast.error("Failed to create checkout session. Please try again.");
        return;
      }
      
      console.log("Checkout session created, redirecting to:", data.url);
      
      // Redirect to the Stripe Checkout session
      window.location.href = data.url;
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
          {isProcessing ? "Processing..." : creditProduct 
            ? `Top Up Credits ($${creditProduct.amount_usd})` 
            : "Top Up Credits"}
        </Button>
      </CardFooter>
    </Card>
  );
}
