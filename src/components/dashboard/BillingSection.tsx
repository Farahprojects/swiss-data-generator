
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

export const BillingSection = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [creditProduct, setCreditProduct] = useState(null);

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

    const fetchTransactions = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from("credit_transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("ts", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching transactions:", error);
          return;
        }

        setTransactions(data || []);
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
      }
    };

    // Load the API credits product
    const fetchCreditProduct = async () => {
      try {
        // Fetch products of type 'credit' from the stripe_products table
        const { data, error } = await supabase
          .from("stripe_products")
          .select("price_id, amount_usd")
          .eq("active", true)
          .eq("type", "credit")
          .order("amount_usd", { ascending: true })
          .limit(1);

        if (error) {
          console.error("Error fetching credit product:", error);
          return;
        }

        if (data && data.length > 0) {
          setCreditProduct(data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch credit product:", err);
      }
    };

    fetchUserBalance();
    fetchTransactions();
    fetchCreditProduct();
  }, [user]);
  
  const handleTopup = async () => {
    if (!user) {
      toast.error("You must be logged in to top up credits");
      return;
    }

    if (!creditProduct?.price_id) {
      toast.error("No credit product available. Please contact support.");
      return;
    }

    setIsProcessingTopup(true);
    try {
      // Store the current path in localStorage
      localStorage.setItem("stripe_return_path", location.pathname);
      if (location.search) {
        localStorage.setItem("stripe_return_tab", location.search.substring(1));
      }
      
      // Use the create-checkout edge function to create a dynamic checkout session
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          mode: "payment",
          priceId: creditProduct.price_id,
          amount: creditProduct.amount_usd,
          returnPath: location.pathname,
          returnTab: location.search ? location.search.substring(1) : ""
        }
      });

      if (error || !data?.url) {
        console.error("Error creating checkout session:", error);
        toast.error("Failed to create checkout session. Please try again.");
        return;
      }
      
      // Redirect to the Stripe Checkout session
      window.location.href = data.url;
    } catch (err) {
      console.error("Failed to initiate top-up:", err);
      toast.error("Failed to create checkout session. Please try again.");
    } finally {
      setIsProcessingTopup(false);
    }
  };
  
  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString();
  };
  
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API Credits Balance</CardTitle>
          <CardDescription>Your current API credits and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <h3 className="font-medium">Current Balance</h3>
                <p className="text-sm text-gray-500">
                  {lastUpdate ? `Last updated: ${formatDate(lastUpdate)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">${isLoading ? "..." : balance.toFixed(2)}</p>
              </div>
            </div>
            <div className="pt-2">
              <Button 
                onClick={handleTopup}
                disabled={isProcessingTopup || !creditProduct}
                className="flex items-center gap-2"
              >
                <PlusCircle size={16} />
                {isProcessingTopup ? "Processing..." : creditProduct 
                  ? `Top-up Credits ($${creditProduct.amount_usd})` 
                  : "Top-up Credits"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Manage your payment settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-8 bg-gray-800 rounded mr-4"></div>
                <span>•••• •••• •••• 4242</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Expires 09/25</span>
              </div>
            </div>
            <div className="pt-2">
              <Button variant="outline">Update Payment Method</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent API credit transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatDate(transaction.ts)}</TableCell>
                    <TableCell>{transaction.description || transaction.api_call_type || "-"}</TableCell>
                    <TableCell>${transaction.amount_usd?.toFixed(2) || "0.00"}</TableCell>
                    <TableCell>
                      <span className={transaction.type === 'debit' ? 'text-red-500' : 'text-green-500'}>
                        {transaction.type || "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-gray-500">
              {isLoading ? "Loading transactions..." : "No transactions found"}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
