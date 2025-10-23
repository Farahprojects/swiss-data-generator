import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentFailureToastProps {
  isVisible: boolean;
  onDismiss: () => void;
  daysUntilCancellation: number | null;
}

export const PaymentFailureToast: React.FC<PaymentFailureToastProps> = ({
  isVisible,
  onDismiss,
  daysUntilCancellation
}) => {
  const [isOpening, setIsOpening] = useState(false);

  const handleUpdatePayment = async () => {
    setIsOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        onDismiss(); // Dismiss toast after opening portal
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open payment portal');
    } finally {
      setIsOpening(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className="bg-orange-50 border-2 border-orange-400 rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Payment Failed
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Your last payment was declined. 
              {daysUntilCancellation !== null && (
                <span className="font-medium">
                  {' '}Your subscription will be canceled in {daysUntilCancellation} {daysUntilCancellation === 1 ? 'day' : 'days'}.
                </span>
              )}
            </p>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleUpdatePayment}
                disabled={isOpening}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white rounded-full font-normal px-4"
              >
                {isOpening ? 'Opening...' : 'Update Payment Method'}
              </Button>
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 rounded-full font-normal px-4"
              >
                Dismiss
              </Button>
            </div>
          </div>
          
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-orange-100 rounded transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

