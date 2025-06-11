
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
import { Wallet } from "lucide-react";

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
    <Card className="flex flex-col h-full overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <div className="bg-gradient-to-r from-primary to-secondary p-1"></div>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2 text-foreground">
          <Wallet className="h-5 w-5 text-primary" />
          Wallet Balance
        </CardTitle>
        <CardDescription className="text-muted-foreground">Available for services and features</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground">Current Balance:</span>
          <span className="text-2xl font-bold text-primary">
            ${isLoading ? "..." : balance.toFixed(2)} USD
          </span>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center pb-2 border-b border-primary/10">
            <span className="text-muted-foreground">Last Updated:</span>
            <span className="font-medium text-foreground">{formattedLastTopUp}</span>
          </div>
          <div className="flex justify-between items-center pb-2">
            <span className="text-muted-foreground">Auto Top-up Trigger:</span>
            <span className="font-medium text-foreground">$45.00</span>
          </div>
          <div className="bg-accent rounded-lg p-3 mt-2 border border-primary/10">
            <p className="text-foreground text-sm">
              Your wallet will automatically top up when the balance falls below $45. Visit the billing section to update your payment method or manage auto top-up settings.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
