
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
      <AlertDialogContent className="sm:max-w-lg border-0 shadow-2xl">
        <AlertDialogHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <AlertDialogTitle className="text-2xl font-light text-gray-900 mb-3 tracking-tight">
            {getErrorTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-center">
            <p className="text-gray-600 font-light leading-relaxed">
              {getSuggestion()}
            </p>
            <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50">
              <p className="text-sm font-light text-gray-500 mb-2">
                Continue with full payment
              </p>
              <p className="text-2xl font-light text-gray-900 tracking-tight">
                ${fullPrice.toFixed(2)}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-3 pt-2">
          <AlertDialogAction 
            onClick={onContinueWithFullPayment}
            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-light text-base rounded-xl transition-all duration-300 hover:scale-[1.02] border-0"
          >
            Continue with Full Payment
          </AlertDialogAction>
          <AlertDialogCancel 
            onClick={onTryAgain} 
            className="w-full h-12 bg-transparent hover:bg-gray-50 text-gray-600 font-light text-base rounded-xl border border-gray-200 transition-all duration-300 hover:border-gray-300"
          >
            Try Another Code
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
