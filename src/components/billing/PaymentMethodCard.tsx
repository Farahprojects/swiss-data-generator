import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, MoreHorizontal, Calendar } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

interface PaymentMethodCardProps {
  paymentMethod: {
    id: string;
    card_brand?: string;
    card_last4?: string;
    exp_month?: number;
    exp_year?: number;
    billing_name?: string;
    active?: boolean;
    payment_status?: string;
    ts?: string;
  };
}

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({ paymentMethod }) => {
  const getBrandIcon = (brand?: string) => {
    // Return appropriate icon based on card brand
    return <CreditCard className="h-5 w-5" />;
  };

  const getBrandColor = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return 'text-blue-600';
      case 'mastercard':
        return 'text-red-600';
      case 'amex':
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={getBrandColor(paymentMethod.card_brand)}>
              {getBrandIcon(paymentMethod.card_brand)}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {paymentMethod.card_brand?.toUpperCase()} ••••{paymentMethod.card_last4}
                </span>
                {paymentMethod.active && (
                  <Badge variant="secondary" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {paymentMethod.billing_name && (
                  <span>{paymentMethod.billing_name}</span>
                )}
                {paymentMethod.exp_month && paymentMethod.exp_year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {String(paymentMethod.exp_month).padStart(2, '0')}/{paymentMethod.exp_year}
                  </span>
                )}
              </div>
              
              {paymentMethod.ts && (
                <p className="text-xs text-muted-foreground">
                  Added {formatDate(paymentMethod.ts)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge 
              variant={paymentMethod.payment_status === 'active' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {paymentMethod.payment_status || 'active'}
            </Badge>
            
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};