import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyGuestPayment } from "@/utils/guest-checkout";
import { useToast } from "@/hooks/use-toast";

const PaymentReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'verifying' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your payment...');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Guard to prevent multiple executions
  const hasProcessed = useRef(false);
  
  useEffect(() => {
    // Prevent multiple executions for the same session
    if (hasProcessed.current) {
      return;
    }
    
    const handlePaymentReturn = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const urlStatus = params.get('status');
        const sessionId = params.get('session_id');
        
        console.log("🔍 Payment return URL analysis:", { 
          urlStatus, 
          sessionId,
          fullUrl: location.search,
          allParams: Object.fromEntries(params.entries())
        });
        
        setDebugInfo({
          urlStatus,
          sessionId,
          allParams: Object.fromEntries(params.entries())
        });
        
        // If we have a session_id, it means successful payment from Stripe
        if (sessionId) {
          console.log("✅ Session ID found - payment was successful:", sessionId);
          
          // Mark as processed to prevent re-execution
          hasProcessed.current = true;
          
          // Verify payment with Stripe and create guest report record
          setStatus('verifying');
          setMessage('Verifying your payment and saving your order...');
          
          console.log("🔄 Starting payment verification with session ID:", sessionId);
          const result = await verifyGuestPayment(sessionId);
          console.log("📊 Verification result:", result);
          
          if (!result.success || !result.verified) {
            console.error("❌ Payment verification failed:", result.error);
            throw new Error(result.error || 'Payment verification failed');
          }
          
          // Payment verified successfully
          setStatus('success');
          setVerificationResult(result);
          
          // Set appropriate success message based on purchase type
          if (result.isService) {
            setMessage('Service booking confirmed! Your purchase has been processed successfully.');
            toast({
              title: "Service Booked!",
              description: `Your ${result.service_title || 'service'} booking has been confirmed.`,
            });
          } else if (result.isCoachReport) {
            setMessage('Order confirmed! Your report will be processed shortly.');
            toast({
              title: "Success!",
              description: `Your report order has been processed successfully.`,
            });
          } else {
            setMessage('Payment confirmed! Your order has been processed and saved to our database.');
            toast({
              title: "Success!",
              description: `Your payment for ${result.reportData?.reportType || 'report'} has been processed successfully.`,
            });
          }
          
          console.log("✅ Payment verification completed successfully");
          return;
        }
        
        // If payment was cancelled (status=cancelled but no session_id)
        if (urlStatus === 'cancelled') {
          console.log("❌ Payment was cancelled by user");
          hasProcessed.current = true;
          setStatus('error');
          setMessage('Payment was cancelled. You can try again anytime.');
          return;
        }
        
        // If we get here, something unexpected happened
        console.error("❌ Unexpected payment return state - no session ID and no cancel status");
        hasProcessed.current = true;
        setStatus('error');
        setMessage('Payment status unclear. Please check your email for confirmation or contact support.');
        
      } catch (error: any) {
        console.error('❌ Error processing payment return:', {
          message: error.message,
          stack: error.stack
        });
        hasProcessed.current = true;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
        
        toast({
          title: "Error",
          description: "There was an issue processing your payment. Please contact support if you were charged.",
          variant: "destructive",
        });
      }
    };
    
    handlePaymentReturn();
  }, [location.search]); // Only depend on location.search

  const getIcon = () => {
    switch (status) {
      case 'loading':
      case 'verifying':
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-primary" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-primary';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-primary';
    }
  };

  // Get the appropriate return button text and action
  const getReturnButton = () => {
    if (status === 'success' && verificationResult) {
      // If it's a coach purchase, return to coach website
      if (verificationResult.coach_slug) {
        return {
          text: "Return to Coach Website",
          action: () => navigate(`/${verificationResult.coach_slug}`)
        };
      }
      // Otherwise return to main report form
      return {
        text: "Order Another Report",
        action: () => navigate('/report')
      };
    }
    
    // Default fallback for error states
    return {
      text: "Return to Report Form",
      action: () => navigate('/report')
    };
  };

  // Extract first name from verification result if available
  const getFirstName = () => {
    if (verificationResult?.reportData?.name) {
      return verificationResult.reportData.name.split(' ')[0];
    }
    return '';
  };

  if (status === 'success' && verificationResult) {
    const returnButton = getReturnButton();
    
    return (
      <div className="h-screen bg-gradient-to-b from-background to-muted/20 flex items-start justify-center pt-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto border-2 border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <CheckCircle className="h-12 w-12 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Payment Successful!</h1>
                  <p className="text-muted-foreground">
                    {verificationResult.isService ? 'Your service booking has been confirmed' : 'Your order has been processed'}
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary mb-2">Thank you for your purchase!</h3>
                <p className="text-foreground">
                  {getFirstName() && `Hi ${getFirstName()}, `}
                  {verificationResult.isService 
                    ? `Your ${verificationResult.service_title || 'service'} booking has been confirmed. You'll receive further details via email.`
                    : verificationResult.isCoachReport
                    ? `Your report order has been confirmed and will be processed shortly. You'll receive an email with your completed report.`
                    : `We've received your payment and your ${verificationResult.reportData?.reportType} report will be processed shortly. You'll receive an email with your completed report.`
                  }
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm mb-6">
                {verificationResult.isService ? (
                  <>
                    <p><strong>Service:</strong> {verificationResult.service_title || 'Service booking'}</p>
                    {verificationResult.coach_name && <p><strong>Coach:</strong> {verificationResult.coach_name}</p>}
                    <p><strong>Amount:</strong> ${(verificationResult.amountPaid / 100).toFixed(2)}</p>
                  </>
                ) : (
                  <>
                    <p><strong>Report Type:</strong> {verificationResult.reportData?.reportType}</p>
                    <p><strong>Email:</strong> {verificationResult.reportData?.email}</p>
                    <p><strong>Amount:</strong> ${verificationResult.reportData?.amount}</p>
                    {verificationResult.coach_name && <p><strong>Coach:</strong> {verificationResult.coach_name}</p>}
                  </>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {verificationResult.isService 
                    ? 'Your booking confirmation has been sent via email.'
                    : 'Your order has been saved and will be processed within 10min hours.'
                  }
                </p>
              </div>

              <Button 
                onClick={returnButton.action}
                variant="outline"
                className="mt-4"
              >
                {returnButton.text}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className={`text-2xl ${getStatusColor()}`}>
            {status === 'loading' && 'Processing Payment'}
            {status === 'verifying' && 'Verifying Payment'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'error' && 'Payment Issue'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {debugInfo && status === 'error' && (
            <div className="bg-red-50 p-4 rounded-lg text-sm">
              <p><strong>Debug Info:</strong></p>
              <p>Status: {debugInfo.urlStatus}</p>
              <p>Session ID: {debugInfo.sessionId || 'Not found'}</p>
              <p>URL Params: {JSON.stringify(debugInfo.allParams)}</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/report')} 
                variant="outline"
                className="w-full"
              >
                Return to Report Form
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentReturn;
