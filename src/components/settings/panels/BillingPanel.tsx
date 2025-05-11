
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink, PlusCircle, CreditCard, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { getStripeLinkByName, STRIPE_LINK_TYPES } from "@/utils/stripe-links";
import { supabase } from "@/integrations/supabase/client";
import { TopupQueueStatus } from "@/components/dashboard/TopupQueueStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mock data - this would come from database in a real app
const mockData = {
  currentBalance: 250,
  apiCallsRemaining: 5000,
  costPerCall: 0.05,
  transactions: [
    { id: "tx_123", date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), amount: 100 },
    { id: "tx_456", date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), amount: 200 },
    { id: "tx_789", date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), amount: 50 },
  ]
};

export const BillingPanel = () => {
  const { user } = useAuth();
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    // Check if we're returning from a payment setup session
    const params = new URLSearchParams(location.search);
    const setup = params.get('setup');
    
    if (setup === 'success') {
      toast.success("Payment method updated successfully!");
      // Clean up URL params
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchPaymentMethod(); // Refresh payment method data
    } else if (setup === 'cancelled') {
      toast.info("Payment method update cancelled.");
      // Clean up URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);
  
  // Fetch the user's saved payment method
  const fetchPaymentMethod = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingPaymentMethod(true);
      
      const { data, error } = await supabase.rpc('get_stripe_customer_id_for_user', {
        user_id_param: user.id
      });
      
      if (error) {
        console.error("Error fetching payment method:", error);
        return;
      }
      
      setPaymentMethod(data);
    } catch (err) {
      console.error("Failed to fetch payment method:", err);
    } finally {
      setIsLoadingPaymentMethod(false);
    }
  };
  
  useEffect(() => {
    if (user?.id) {
      fetchPaymentMethod();
    }
  }, [user]);
  
  const handleTopup = async () => {
    if (!user) {
      toast.error("You must be logged in to top-up credits");
      return;
    }
    
    setIsProcessingTopup(true);
    try {
      // Try to get API credits topup link from the database
      const topupLink = await getStripeLinkByName(STRIPE_LINK_TYPES.API_CREDITS_TOPUP);
      
      if (!topupLink || !topupLink.url) {
        // Fallback to creating a topup checkout session
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: {
            mode: "payment",
            product: "API Credits",
            amount: 100, // Default amount for topup
            returnPath: location.pathname
          }
        });
        
        if (error || !data?.url) {
          toast.error("Could not create checkout session");
          throw new Error("Could not create checkout session");
        }
        
        // Redirect to the payment URL
        window.location.href = data.url;
      } else {
        // Use the preconfigured topup link
        window.location.href = topupLink.url;
      }
    } catch (err) {
      console.error("Failed to initiate topup:", err);
      toast.error("Failed to process topup. Please try again.");
    } finally {
      setIsProcessingTopup(false);
    }
  };
  
  const handleUpdatePayment = async () => {
    if (!user) {
      toast.error("You must be logged in to update your payment method");
      return;
    }
    
    setIsUpdatingPayment(true);
    try {
      // Store the current path and tab in localStorage
      localStorage.setItem("stripe_return_path", location.pathname);
      const currentTab = "panel=billing"; // Since we're already on the billing panel
      localStorage.setItem("stripe_return_tab", currentTab);
      
      // Call the create-checkout edge function with setup mode
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          mode: "setup",
          returnPath: location.pathname,
          returnTab: currentTab
        }
      });
      
      if (error || !data?.url) {
        toast.error("Could not create payment setup session");
        throw new Error("Could not create payment setup session");
      }
      
      // Redirect to the payment update URL
      window.location.href = data.url;
    } catch (err) {
      console.error("Failed to initiate payment update:", err);
      toast.error("Failed to update payment method. Please try again.");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Function to render payment method information or alert
  const renderPaymentMethodSection = () => {
    if (isLoadingPaymentMethod) {
      return (
        <div className="py-4 text-center text-gray-500">
          Loading payment information...
        </div>
      );
    }
    
    // If no payment method found
    if (!paymentMethod?.stripe_payment_method_id) {
      return (
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>
            You haven't added a payment method yet. This is required for automatic top-ups when your balance is low.
            <Button 
              variant="outline" 
              onClick={handleUpdatePayment}
              disabled={isUpdatingPayment}
              className="w-full mt-3"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {isUpdatingPayment ? "Processing..." : "Add Payment Method"}
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    
    // If payment method exists
    return (
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
          <Button 
            variant="outline" 
            onClick={handleUpdatePayment}
            disabled={isUpdatingPayment}
            className="flex items-center"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {isUpdatingPayment ? "Processing..." : "Update Payment Method"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Billing & API Credits</h2>
      
      <div className="mb-8 p-6 border rounded-lg">
        <h3 className="text-lg font-medium mb-4">API Credits Balance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Current Balance</p>
            <p className="font-medium">${mockData.currentBalance.toFixed(2)}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">API Calls Remaining</p>
            <p className="font-medium">{mockData.apiCallsRemaining.toLocaleString()}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Cost Per Call</p>
            <p className="font-medium">${mockData.costPerCall.toFixed(3)}</p>
          </div>
        </div>
        
        <Button 
          onClick={handleTopup} 
          disabled={isProcessingTopup}
          className="flex items-center gap-2"
        >
          <PlusCircle size={16} />
          {isProcessingTopup ? "Processing..." : "Top-up Credits"}
        </Button>
      </div>
      
      {/* Add the TopupQueueStatus component */}
      <div className="mb-8">
        <TopupQueueStatus />
      </div>
      
      <div className="mb-8 p-6 border rounded-lg">
        <h3 className="text-lg font-medium mb-4">Payment Method</h3>
        {renderPaymentMethodSection()}
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Transaction History</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Transaction ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {mockData.transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b">
                  <td className="py-3 px-4">{transaction.date.toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <Button variant="link" className="p-0 h-auto">
                      {transaction.id}
                    </Button>
                  </td>
                  <td className="py-3 px-4">${transaction.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
