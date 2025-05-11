
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
import { AlertCircle, CreditCard, PlusCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const BillingSection = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [isUpdatingPaymentMethod, setIsUpdatingPaymentMethod] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [creditProduct, setCreditProduct] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(true);

  // Check if we're returning from a successful payment method setup
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'setup-success') {
      // Refresh payment method data
      fetchPaymentMethod();
      toast.success("Payment method updated successfully!");
    }
  }, [searchParams]);

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
    fetchPaymentMethod();
  }, [user]);
  
  // Separated payment method fetching function so we can call it after setup completes
  const fetchPaymentMethod = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingPaymentMethod(true);
      
      // First, check the most recent transaction to find a payment method ID
      const { data: txData, error: txError } = await supabase
        .from("credit_transactions")
        .select("stripe_payment_method_id, card_brand, card_last4, stripe_customer_id")
        .eq("user_id", user.id)
        .not('stripe_payment_method_id', 'is', null)
        .order("ts", { ascending: false })
        .limit(1);
      
      if (txError) {
        console.error("Error fetching payment method:", txError);
        return;
      }
      
      if (txData && txData.length > 0 && txData[0].stripe_payment_method_id) {
        // Create a simple payment method object with the available data
        setPaymentMethod({
          payment_method_id: txData[0].stripe_payment_method_id,
          last4: txData[0].card_last4 || "****", 
          exp_month: null,  // We don't have this data in credit_transactions
          exp_year: null,   // We don't have this data in credit_transactions
          brand: txData[0].card_brand || "card" 
        });
      }
    } catch (err) {
      console.error("Failed to fetch payment method:", err);
    } finally {
      setIsLoadingPaymentMethod(false);
    }
  };
  
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
  
  const handleUpdatePaymentMethod = async () => {
    if (!user) {
      toast.error("You must be logged in to update your payment method");
      return;
    }

    setIsUpdatingPaymentMethod(true);
    try {
      // Store the current path in localStorage for return
      localStorage.setItem("stripe_return_path", location.pathname);
      if (location.search) {
        localStorage.setItem("stripe_return_tab", location.search.substring(1));
      }
      
      // Use the create-checkout edge function with mode: "setup"
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          mode: "setup",
          returnPath: location.pathname,
          returnTab: location.search ? location.search.substring(1) : ""
        }
      });

      if (error || !data?.url) {
        console.error("Error creating setup session:", error);
        toast.error("Failed to create payment method setup session. Please try again.");
        return;
      }
      
      // Redirect to the Stripe Checkout session
      window.location.href = data.url;
    } catch (err) {
      console.error("Failed to initiate payment method update:", err);
      toast.error("Failed to update payment method. Please try again.");
    } finally {
      setIsUpdatingPaymentMethod(false);
    }
  };
  
  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString();
  };

  // Get CSS class for card brand
  const getCardBrandClass = (brand) => {
    const brandMap = {
      'visa': 'bg-blue-900',
      'mastercard': 'bg-gradient-to-r from-red-500 to-orange-500',
      'amex': 'bg-blue-500',
      'discover': 'bg-orange-500',
      'diners': 'bg-gray-700',
      'jcb': 'bg-green-600',
      'unionpay': 'bg-red-700',
    };
    
    return brandMap[brand?.toLowerCase()] || 'bg-gray-800';
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
          {isLoadingPaymentMethod ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-pulse flex items-center">
                <div className="h-8 w-8 rounded-full bg-gray-300 mr-3"></div>
                <div className="h-4 bg-gray-300 rounded w-48"></div>
              </div>
            </div>
          ) : !paymentMethod ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No payment method found. Add a payment method to enable automatic top-ups.
              </AlertDescription>
              <Button 
                onClick={handleUpdatePaymentMethod} 
                variant="outline" 
                size="sm" 
                className="ml-auto"
                disabled={isUpdatingPaymentMethod}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isUpdatingPaymentMethod ? "Processing..." : "Add Payment Method"}
              </Button>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className={`w-12 h-8 ${getCardBrandClass(paymentMethod.brand)} rounded mr-4 flex items-center justify-center text-white text-xs font-bold uppercase`}
                  >
                    {paymentMethod.brand || "Card"}
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">
                        {paymentMethod.brand ? paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1) : "Card"}
                      </span>
                      <span className="ml-2">•••• {paymentMethod.last4 || "****"}</span>
                      <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                    </div>
                    {paymentMethod.exp_month && paymentMethod.exp_year && (
                      <span className="text-sm text-gray-500">
                        Expires {paymentMethod.exp_month}/{paymentMethod.exp_year.toString().substr(-2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  onClick={handleUpdatePaymentMethod} 
                  disabled={isUpdatingPaymentMethod}
                >
                  {isUpdatingPaymentMethod ? "Processing..." : "Update Payment Method"}
                </Button>
              </div>
            </div>
          )}
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
