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
