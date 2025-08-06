import React from 'react';
import { useStripeSuccess } from '@/contexts/StripeSuccessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export const StripeSuccessModal: React.FC = () => {
  const { stripeSuccess, proceedToReport } = useStripeSuccess();

  if (!stripeSuccess.showSuccessModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-4">
            {stripeSuccess.isProcessing ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Processing Your Payment
                </h2>
                <p className="text-gray-600">
                  We're verifying your payment and preparing your report...
                </p>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Payment Successful!
                </h2>
                <p className="text-gray-600">
                  Your payment has been processed successfully. Your report is ready to be generated.
                </p>
                <p className="text-sm text-gray-500">
                  Would you like to continue to view your report?
                </p>
              </>
            )}
          </div>
          
          <div className="flex justify-center">
            {!stripeSuccess.isProcessing && (
              <Button
                onClick={proceedToReport}
                className="w-full"
              >
                Continue to Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 