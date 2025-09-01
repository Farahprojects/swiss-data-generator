import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CreditCard, 
  Zap,
  Download,
  ExternalLink
} from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount_usd: number;
  description?: string;
  stripe_pid?: string;
  ts: string;
  api_call_type?: string;
  reference_id?: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
      case 'topup':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'debit':
      case 'charge':
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      default:
        return <Zap className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'topup':
        return 'text-green-600';
      case 'debit':
      case 'charge':
        return 'text-red-600';
      default:
        return 'text-foreground';
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'credit' || type === 'topup' ? '+' : '-';
    return `${prefix}${formatCurrency(Math.abs(amount))}`;
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No transactions found</p>
        <p className="text-sm mt-1">Your transaction history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <Card key={transaction.id} className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getTransactionIcon(transaction.type)}
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {transaction.description || `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} Transaction`}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {transaction.type}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatDate(transaction.ts)}</span>
                    
                    {transaction.api_call_type && (
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {transaction.api_call_type}
                      </span>
                    )}
                    
                    {transaction.stripe_pid && (
                      <span className="font-mono text-xs">
                        {transaction.stripe_pid}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`font-medium ${getTransactionColor(transaction.type)}`}>
                  {formatAmount(transaction.amount_usd, transaction.type)}
                </span>
                
                {transaction.stripe_pid && (
                  <Button variant="ghost" size="sm" className="gap-1">
                    <ExternalLink className="h-3 w-3" />
                    View
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {transactions.length >= 50 && (
        <div className="text-center pt-4">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Load More Transactions
          </Button>
        </div>
      )}
    </div>
  );
};