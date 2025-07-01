
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface PromoConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTryAgain: () => void;
  onContinueWithFullPayment: () => void;
  errorMessage: string;
  errorType: string;
  fullPrice: number;
}

export const PromoConfirmationDialog: React.FC<PromoConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onTryAgain,
  onContinueWithFullPayment,
  errorMessage,
  errorType,
  fullPrice
}) => {
  const getErrorTitle = () => {
    switch (errorType) {
      case 'expired':
        return 'Promo Code Expired';
      case 'usage_limit':
        return 'Promo Code Limit Reached';
      case 'invalid':
        return 'Invalid Promo Code';
      case 'network_error':
        return 'Validation Error';
      default:
        return 'Promo Code Issue';
    }
  };

  const getSuggestion = () => {
    switch (errorType) {
      case 'expired':
        return 'This promo code has expired. Try entering a different code or continue with the full price.';
      case 'usage_limit':
        return 'This promo code has reached its usage limit. Try a different code or continue with the full price.';
      case 'invalid':
        return 'Please check the code spelling and try again, or continue with the full price.';
      case 'network_error':
        return 'There was an issue validating your promo code. Please try again or continue with the full price.';
      default:
        return 'There was an issue with your promo code. You can try another code or continue with the full price.';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertDialogTitle className="text-lg">{getErrorTitle()}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <p className="text-sm text-gray-600">{getSuggestion()}</p>
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-sm font-medium text-gray-900">
                Continue with full payment: ${fullPrice.toFixed(2)}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onTryAgain} className="order-2 sm:order-1">
            Try Another Code
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onContinueWithFullPayment}
            className="order-1 sm:order-2 bg-primary hover:bg-primary/90"
          >
            Continue with Full Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
