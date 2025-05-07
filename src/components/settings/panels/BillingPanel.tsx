import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { getStripeLinkByName, STRIPE_LINK_TYPES } from "@/utils/stripe-links";
import { supabase } from "@/integrations/supabase/client";

// Mock data - this would come from database in a real app
const mockSubscriptionData = {
  plan: "Starter",
  apiCallLimit: 50000,
  apiCallsUsed: 5000,
  nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  invoices: [
    { id: "inv_123", date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), amount: 19.99 },
    { id: "inv_456", date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), amount: 19.99 },
    { id: "inv_789", date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), amount: 19.99 },
  ]
};

export const BillingPanel = () => {
  const { user } = useAuth();
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    // Check if we're returning from a payment setup session
    const params = new URLSearchParams(location.search);
    const setup = params.get('setup');
    
    if (setup === 'success') {
      toast.success("Payment method updated successfully!");
      // Clean up URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (setup === 'cancelled') {
      toast.info("Payment method update cancelled.");
      // Clean up URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);
  
  const handleManageSubscription = async () => {
    setIsLoadingSubscription(true);
    
    try {
      // Get the subscription management link from the database
      const subscriptionLink = await getStripeLinkByName(STRIPE_LINK_TYPES.MANAGE_SUBSCRIPTION);
      
      if (!subscriptionLink || !subscriptionLink.url) {
        toast.error("Could not find subscription management link");
        throw new Error("Could not find subscription management link");
      }
      
      // Redirect to the subscription management URL
      window.location.href = subscriptionLink.url;
    } catch (error) {
      console.error("Failed to redirect to subscription portal:", error);
      toast.error("Could not access subscription management. Please try again later.");
    } finally {
      setIsLoadingSubscription(false);
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

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Billing & Subscription</h2>
      
      <div className="mb-8 p-6 border rounded-lg">
        <h3 className="text-lg font-medium mb-4">Current Plan</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Plan Name</p>
            <p className="font-medium">{mockSubscriptionData.plan}</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Next Billing Date</p>
            <p className="font-medium">
              {mockSubscriptionData.nextBillingDate.toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">API Calls</p>
            <p className="font-medium">
              {mockSubscriptionData.apiCallsUsed.toLocaleString()} / {mockSubscriptionData.apiCallLimit.toLocaleString()}
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleManageSubscription} 
          disabled={isLoadingSubscription}
        >
          <ExternalLink size={16} className="mr-2" />
          {isLoadingSubscription ? "Loading..." : "Manage Subscription"}
        </Button>
      </div>
      
      <div className="mb-8 p-6 border rounded-lg">
        <h3 className="text-lg font-medium mb-4">Payment Method</h3>
        
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
            >
              {isUpdatingPayment ? "Processing..." : "Update Payment Method"}
            </Button>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Billing History</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Invoice</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {mockSubscriptionData.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b">
                  <td className="py-3 px-4">{invoice.date.toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <Button variant="link" className="p-0 h-auto">
                      {invoice.id}
                    </Button>
                  </td>
                  <td className="py-3 px-4">${invoice.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
