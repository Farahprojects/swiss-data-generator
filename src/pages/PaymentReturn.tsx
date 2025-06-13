
import { useEffect, useState } from "react";
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
  
  useEffect(() => {
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
          setStatus('error');
          setMessage('Payment was cancelled. You can try again anytime.');
          return;
        }
        
        // If we get here, something unexpected happened
        console.error("❌ Unexpected payment return state - no session ID and no cancel status");
        setStatus('error');
        setMessage('Payment status unclear. Please check your email for confirmation or contact support.');
        
      } catch (error: any) {
        console.error('❌ Error processing payment return:', {
          message: error.message,
          stack: error.stack
        });
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
  }, [location, navigate, toast]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
      case 'verifying':
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-primary';
    }
  };

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
          
          {reportDetails && status === 'success' && (
            <div className="bg-muted p-4 rounded-lg text-sm">
              <p><strong>Report Type:</strong> {reportDetails.reportType}</p>
              <p><strong>Email:</strong> {reportDetails.email}</p>
              <p><strong>Amount:</strong> ${reportDetails.amount}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Your order details have been saved to our database and will be processed soon.
              </p>
            </div>
          )}
          
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
                onClick={() => navigate('/')} 
                variant="outline"
                className="w-full"
              >
                Return to Home
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
          
          {status === 'success' && (
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Order Another Report
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentReturn;
