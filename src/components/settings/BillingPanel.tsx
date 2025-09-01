import React from 'react';
import { BillingDashboard } from '@/components/billing/BillingDashboard';

export const BillingPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-light">
          Billing & <em className="italic">Subscription</em>
        </h2>
        <p className="text-muted-foreground mt-1">
          Manage your billing information, subscription, and usage
        </p>
      </div>
      
      <BillingDashboard />
    </div>
  );
};