
export type PaymentFlowState = 
  | 'checkout_initiated'
  | 'checkout_completed'
  | 'payment_processing'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'account_creating'
  | 'account_created'
  | 'subscription_active'
  | 'subscription_failed'
  | 'flow_expired'
  | 'flow_abandoned';

export interface PaymentFlow {
  id: string;
  session_id: string;
  customer_email: string;
  user_id?: string;
  flow_state: PaymentFlowState;
  plan_type?: string;
  error_message?: string;
  retry_count: number;
  add_ons?: Record<string, any>;
  metadata?: Record<string, any>;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}
