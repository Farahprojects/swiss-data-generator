
import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a Stripe checkout session for guest users with direct amount
 * @param options Configuration for the guest checkout session
 */
export const initiateGuestCheckout = async ({
  email,
  amount,
  description,
  successUrl,
  cancelUrl,
}: {
  email: string;
  amount: number;
  description: string;
  successUrl?: string;
  cancelUrl?: string;
}) => {
  try {
    // Validate required parameters
    if (!email || !amount || !description) {
      throw new Error("Email, amount, and description are required");
    }

    // Call the Supabase Edge Function to create a guest checkout session
    const { data, error } = await supabase.functions.invoke("create-guest-checkout", {
      body: {
        email,
        amount,
        description,
        successUrl: successUrl || window.location.origin + '/payment-return?status=success',
        cancelUrl: cancelUrl || window.location.origin + '/payment-return?status=cancelled',
      },
    });

    if (error) {
      console.error("Error creating guest checkout session:", error);
      throw new Error(error.message || "Failed to create checkout session");
    }

    if (!data?.url) {
      throw new Error("No checkout URL returned from server");
    }

    // Redirect to the Stripe checkout URL
    window.location.href = data.url;
    return { success: true };
  } catch (err) {
    console.error("Failed to initiate guest checkout:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error occurred" 
    };
  }
};

/**
 * Creates a guest checkout session for a custom amount with description
 * @param email Guest user's email
 * @param amount Amount in dollars
 * @param description Clear description for the charge
 */
export const guestCheckoutWithAmount = async (email: string, amount: number, description: string) => {
  return initiateGuestCheckout({ email, amount, description });
};
