import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useBillingData } from '@/hooks/useBillingData';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { PaymentMethodCard } from './PaymentMethodCard';
import { UsageChart } from './UsageChart';
import { TransactionHistory } from './TransactionHistory';

export const BillingDashboard: React.FC = () => {
  const { 
    billingData, 
    isLoading, 
    isConnected, 
    refreshData, 
    lastUpdated 
  } = useBillingData();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const {
    profile,
    credits,
    paymentMethods,
    apiUsage,
    transactions
  } = billingData || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-foreground">
            Billing & <em className="italic">Usage</em>
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription, payment methods, and usage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Subscription Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-light">
                  {profile?.subscription_plan || 'Free'}
                </span>
                <Badge 
                  variant={profile?.subscription_active ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {profile?.subscription_status || 'inactive'}
                </Badge>
              </div>
              {profile?.subscription_next_charge && (
                <p className="text-sm text-muted-foreground">
                  Next billing: {formatDate(profile.subscription_next_charge)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Credit Balance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <span className="text-2xl font-light">
                {formatCurrency(credits?.balance_usd || 0)}
              </span>
              <p className="text-sm text-muted-foreground">
                Available balance
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <span className="text-2xl font-light">
                {formatCurrency(apiUsage?.monthly_total || 0)}
              </span>
              <p className="text-sm text-muted-foreground">
                This month
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Manage your payment methods and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods?.length > 0 ? (
              paymentMethods.map((method: any) => (
                <PaymentMethodCard 
                  key={method.id} 
                  paymentMethod={method} 
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payment methods added yet</p>
                <Button variant="outline" className="mt-3">
                  Add Payment Method
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Analytics */}
      {apiUsage && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Analytics</CardTitle>
            <CardDescription>
              Your API usage over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageChart data={apiUsage.daily_usage || []} />
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Transaction History
            </span>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </CardTitle>
          <CardDescription>
            Recent billing transactions and credits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionHistory transactions={transactions || []} />
        </CardContent>
      </Card>

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-muted-foreground text-center">
          Last updated: {formatDate(lastUpdated)}
        </p>
      )}
    </div>
  );
};