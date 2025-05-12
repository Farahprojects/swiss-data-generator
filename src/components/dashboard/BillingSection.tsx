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
import { AlertCircle, CreditCard, PlusCircle, CheckCircle, DollarSign } from "lucide-react";
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
        // Note: this query will fail as credit_transactions table doesn't exist yet
        // We'll keep it but handle the error gracefully until the table is created
        const { data, error } = await supabase
          .from("api_usage")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
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
      
      // Fetch the latest payment method for the user from payment_method table
      const { data, error } = await supabase
        .from("payment_method")
        .select("*")
        .eq("user_id", user.id)
        .order("ts", { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error("Error fetching payment method:", error);
        setPaymentMethod(null);
        return;
      }
      
      if (data && data.stripe_payment_method_id) {
        // Create a payment method object with the available data
        setPaymentMethod({
          payment_method_id: data.stripe_payment_method_id,
          last4: data.card_last4 || "****", 
          exp_month: data.exp_month,
          exp_year: data.exp_year,
          brand: data.card_brand || "card" 
        });
      } else {
        console.log("No payment method found for user");
        setPaymentMethod(null);
      }
    } catch (err) {
      console.error("Failed to fetch payment method:", err);
      setPaymentMethod(null);
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
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Billing & Credits</h2>
      
      {/* Credit Balance Card */}
      <Card className="mb-6 overflow-hidden border-2 border-gray-100">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                API Credits Balance
              </CardTitle>
              <CardDescription>Your current API credits and usage</CardDescription>
            </div>
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold text-lg">
              ${isLoading ? "..." : balance.toFixed(2)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <h3 className="font-medium">Balance Status</h3>
                <p className="text-sm text-gray-500">
                  {lastUpdate ? `Last updated: ${formatDate(lastUpdate)}` : "Not yet updated"}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-sm ${balance > 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {balance > 10 ? 'Healthy' : 'Low Balance'}
                </span>
              </div>
            </div>
            <div className="pt-2">
              <Button 
                onClick={handleTopup}
                disabled={isProcessingTopup || !creditProduct}
                className="flex items-center gap-2 w-full sm:w-auto"
                size="lg"
              >
                <PlusCircle size={18} />
                {isProcessingTopup ? "Processing..." : creditProduct 
                  ? `Top-up Credits ($${creditProduct.amount_usd})` 
                  : "Top-up Credits"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Card */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500/10 to-transparent p-1"></div>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Payment Method
          </CardTitle>
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
            <Alert className="bg-blue-50 border border-blue-100">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-800">
                No payment method found. Add a payment method to enable automatic top-ups.
              </AlertDescription>
              <Button 
                onClick={handleUpdatePaymentMethod} 
                variant="outline" 
                size="sm" 
                className="ml-auto border border-blue-200 text-blue-700 hover:bg-blue-50"
                disabled={isUpdatingPaymentMethod}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isUpdatingPaymentMethod ? "Processing..." : "Add Payment Method"}
              </Button>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div 
                    className={`w-14 h-10 ${getCardBrandClass(paymentMethod.brand)} rounded-md mr-4 flex items-center justify-center text-white text-xs font-bold uppercase`}
                  >
                    {paymentMethod.brand || "Card"}
                  </div>
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">
                        {paymentMethod.brand ? paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1) : "Card"}
                      </span>
                      <span className="mx-2 text-gray-400">•••• {paymentMethod.last4 || "****"}</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    {paymentMethod.exp_month && paymentMethod.exp_year && (
                      <span className="text-sm text-gray-500">
                        Expires {paymentMethod.exp_month}/{paymentMethod.exp_year.toString().substr(-2)}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleUpdatePaymentMethod} 
                  disabled={isUpdatingPaymentMethod}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  {isUpdatingPaymentMethod ? "Processing..." : "Update Card"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500/10 to-transparent p-1"></div>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Transaction History</CardTitle>
          <CardDescription>Your recent API credit transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-[100px]">Amount</TableHead>
                    <TableHead className="w-[80px]">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{formatDate(transaction.created_at)}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{transaction.endpoint || "API Usage"}</TableCell>
                      <TableCell className="text-right font-medium">${transaction.total_cost_usd?.toFixed(2) || "0.00"}</TableCell>
                      <TableCell>
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded text-xs">debit</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-300 rounded w-32 mx-auto"></div>
                  <div className="h-3 bg-gray-200 rounded w-48 mx-auto"></div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 mb-2">No transactions found</p>
                  <p className="text-sm text-gray-400">Your transactions will appear here once you start using the API</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
