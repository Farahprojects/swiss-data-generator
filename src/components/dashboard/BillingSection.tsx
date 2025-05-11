
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TopupQueueStatus } from "@/components/dashboard/TopupQueueStatus";

export function BillingSection() {
  const { user } = useAuth();
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
  
  const handleUpdatePayment = async () => {
    if (!user) {
      toast.error("You must be logged in to update your payment method");
      return;
    }
    
    setIsUpdatingPayment(true);
    try {
      // Store the current path and tab in localStorage
      localStorage.setItem("stripe_return_path", location.pathname);
      const currentTab = "tab=billing"; // Since we're already on the billing tab
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing & Payments</h1>
      <p className="text-muted-foreground">Manage your payment methods and subscription details</p>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Manage your payment methods for automatic top-ups and subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderPaymentMethodSection()}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Automatic Top-ups Status</CardTitle>
            <CardDescription>
              Your account will be automatically topped up when your balance is low
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopupQueueStatus />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View your recent transactions and billing history
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <tr className="border-b">
                    <td className="py-3 px-4">{new Date().toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <Button variant="link" className="p-0 h-auto">
                        tx_123456789
                      </Button>
                    </td>
                    <td className="py-3 px-4">$100.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
