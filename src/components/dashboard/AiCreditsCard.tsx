
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const AiCreditsCard = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
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
            <span>Auto top-up at $45</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
