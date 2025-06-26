
import { supabase } from "@/integrations/supabase/client";

interface CheckoutParams {
  amount: number;
  email: string;
  description: string;
  reportData: any;
}

interface CheckoutResult {
  success: boolean;
  error?: string;
}

interface VerificationResult {
  success: boolean;
  verified: boolean;
  error?: string;
  reportData?: any;
  amountPaid?: number;
  coach_slug?: string;
  coach_name?: string;
  isService?: boolean;
  isCoachReport?: boolean;
  service_title?: string;
}

export const initiateGuestCheckout = async ({
  amount,
  email,
  description,
  reportData,
}: CheckoutParams): Promise<CheckoutResult> => {
  try {
    console.log('Initiating guest checkout with data:', { amount, email, description, reportData });

    const { data, error } = await supabase.functions.invoke('create-guest-checkout', {
      body: {
        amount,
        email,
        description,
        reportData: {
          ...reportData,
          // Ensure coach attribution is included
          coachSlug: reportData.coachSlug || null,
          coachName: reportData.coachName || null,
        },
      },
    });

    if (error) {
      console.error('Checkout function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create checkout session',
      };
    }

    if (data?.url) {
      console.log('Checkout session created successfully:', data.sessionId);
      // Redirect to Stripe checkout
      window.location.href = data.url;
      return { success: true };
    } else {
      console.error('No checkout URL received from function');
      return {
        success: false,
        error: 'No checkout URL received',
      };
    }
  } catch (error) {
    console.error('Error in initiateGuestCheckout:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
};

export const verifyGuestPayment = async (sessionId: string): Promise<VerificationResult> => {
  try {
    console.log('Verifying guest payment with session ID:', sessionId);

    const { data, error } = await supabase.functions.invoke('verify-guest-payment', {
      body: { sessionId },
    });

    if (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify payment',
      };
    }

    if (data?.verified) {
      console.log('Payment verification successful:', data);
      return {
        success: true,
        verified: true,
        reportData: data.reportData,
        amountPaid: data.amountPaid,
        coach_slug: data.coach_slug,
        coach_name: data.coach_name,
        isService: data.isService,
        isCoachReport: data.isCoachReport,
        service_title: data.service_title,
      };
    } else {
      console.error('Payment verification failed:', data);
      return {
        success: false,
        verified: false,
        error: data?.error || 'Payment verification failed',
      };
    }
  } catch (error) {
    console.error('Error in verifyGuestPayment:', error);
    return {
      success: false,
      verified: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
};
