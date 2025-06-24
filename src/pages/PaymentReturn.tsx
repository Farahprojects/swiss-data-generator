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
  const [reportDetails, setReportDetails] = useState<any>(null);
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
          const verificationResult = await verifyGuestPayment(sessionId);
          console.log("📊 Verification result:", verificationResult);
          
          if (!verificationResult.success || !verificationResult.verified) {
            console.error("❌ Payment verification failed:", verificationResult.error);
            throw new Error(verificationResult.error || 'Payment verification failed');
          }
          
          // Payment verified and guest report record created
          setStatus('success');
          setMessage('Payment confirmed! Your order has been processed and saved to our database.');
          setReportDetails(verificationResult.reportData);
          
          console.log("✅ Payment verification completed successfully");
          
          toast({
            title: "Success!",
            description: `Your payment for ${verificationResult.reportData.reportType} has been processed successfully.`,
          });
          
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

  // Extract first name from report details if available
  const getFirstName = () => {
    if (reportDetails?.name) {
      return reportDetails.name.split(' ')[0];
    }
    return '';
  };

  if (status === 'success' && reportDetails) {
    return (
      <div className="h-screen bg-gradient-to-b from-background to-muted/20 flex items-start justify-center pt-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto border-2 border-primary/20">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <CheckCircle className="h-12 w-12 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Payment Successful!</h1>
                  <p className="text-muted-foreground">Your report order has been processed</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary mb-2">Thank you for your purchase!</h3>
                <p className="text-foreground">
                  {getFirstName() && `Hi ${getFirstName()}, `}
                  We've received your payment and your {reportDetails.reportType} report will be processed shortly. 
                  You'll receive an email at {reportDetails.email} with your completed report.
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg text-sm mb-6">
                <p><strong>Report Type:</strong> {reportDetails.reportType}</p>
                <p><strong>Email:</strong> {reportDetails.email}</p>
                <p><strong>Amount:</strong> ${reportDetails.amount}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Your order has been saved and will be processed within 24 hours.
                </p>
              </div>

              <Button 
                onClick={() => navigate('/report')} 
                variant="outline"
                className="mt-4"
              >
                Order Another Report
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
