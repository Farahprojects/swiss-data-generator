
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigationState } from "@/contexts/NavigationStateContext";

const PaymentReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(true);
  const { getSafeRedirectPath } = useNavigationState();
  
  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    const amount = params.get('amount');
    
    // Get the return path from localStorage with fallback
    const returnPath = localStorage.getItem('stripe_return_path') || getSafeRedirectPath();
    const returnTab = localStorage.getItem('stripe_return_tab') || '';
    
    // Build the return URL with the appropriate tab if available
    let redirectUrl = returnPath;
    if (returnTab && !redirectUrl.includes('?')) {
      redirectUrl += `?${returnTab}`;
    } else if (returnTab) {
      redirectUrl += `&${returnTab}`;
    }
    
    // Show appropriate toast based on the payment status
    setTimeout(() => {
      if (status === 'success') {
        if (amount) {
          toast.success(`Successfully topped up $${amount} in credits!`);
        } else {
          toast.success("Payment completed successfully!");
        }
      } else if (status === 'setup-success') {
        toast.success("Payment method updated successfully!");
      } else if (status === 'cancelled' || status === 'setup-cancelled') {
        toast.info(status === 'cancelled' ? "Payment was cancelled." : "Payment method update was cancelled.");
      }
      
      // Remove stored paths from localStorage
      localStorage.removeItem('stripe_return_path');
      localStorage.removeItem('stripe_return_tab');
      
      // Redirect the user
      navigate(redirectUrl, { replace: true });
      setRedirecting(false);
    }, 500); // Small delay to ensure transition feels smooth
  }, [location, navigate, getSafeRedirectPath]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Processing your payment...</h1>
        <p className="text-gray-600">You'll be redirected in a moment.</p>
      </div>
    </div>
  );
};

export default PaymentReturn;
