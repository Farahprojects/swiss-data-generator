
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getStripeReturnLocation } from "@/utils/stripe-links";

const PaymentReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(true);
  
  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    
    // Get the return location with a fallback to dashboard/billing
    const returnLocation = getStripeReturnLocation('/dashboard/billing');
    
    // Create the final URL with status parameter if available
    let redirectUrl = returnLocation;
    if (status && !redirectUrl.includes('status=')) {
      redirectUrl += redirectUrl.includes('?') ? `&status=${status}` : `?status=${status}`;
    }
    
    // No toasts - we'll handle success indication with animations in the component
    setTimeout(() => {
      // Redirect the user
      navigate(redirectUrl, { replace: true });
      setRedirecting(false);
    }, 500); // Small delay to ensure transition feels smooth
  }, [location, navigate]);

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
