
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { verifyGuestPayment } from "@/utils/guest-checkout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PaymentReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'verifying' | 'generating' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your payment...');
  const [reportDetails, setReportDetails] = useState<any>(null);
  
  useEffect(() => {
    const handlePaymentReturn = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const urlStatus = params.get('status');
        const sessionId = params.get('session_id');
        
        console.log("Payment return params:", { urlStatus, sessionId });
        
        // If payment was cancelled
        if (urlStatus === 'cancelled') {
          setStatus('error');
          setMessage('Payment was cancelled. You can try again anytime.');
          return;
        }
        
        // If no session ID, fall back to old behavior
        if (!sessionId) {
          console.log("No session ID found, redirecting to dashboard");
          setTimeout(() => {
            navigate('/dashboard/billing', { replace: true });
          }, 2000);
          return;
        }
        
        // Verify payment with Stripe
        setStatus('verifying');
        setMessage('Verifying your payment...');
        
        const verificationResult = await verifyGuestPayment(sessionId);
        console.log("Verification result:", verificationResult);
        
        if (!verificationResult.success || !verificationResult.verified) {
          throw new Error(verificationResult.error || 'Payment verification failed');
        }
        
        // Payment verified, now generate report
        setStatus('generating');
        setMessage('Payment confirmed! Generating your report...');
        setReportDetails(verificationResult.reportData);
        
        // Generate the report using the stored metadata
        const { data: reportData, error: reportError } = await supabase.functions.invoke('standard-report', {
          body: verificationResult.reportData,
        });
        
        if (reportError) {
          throw new Error(`Report generation failed: ${reportError.message}`);
        }
        
        // Success!
        setStatus('success');
        setMessage('Report generated and sent to your email!');
        
        toast({
          title: "Success!",
          description: `Your ${verificationResult.reportData.reportType} report has been generated and sent to ${verificationResult.reportData.email}`,
        });
        
      } catch (error) {
        console.error('Error processing payment return:', error);
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
      case 'generating':
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
            {status === 'generating' && 'Generating Report'}
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
