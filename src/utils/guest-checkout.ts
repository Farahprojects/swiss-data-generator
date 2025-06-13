
import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a Stripe checkout session for guest users
 * @param options Configuration for the guest checkout session
 */
export const initiateGuestCheckout = async ({
  email,
  amount,
  priceId,
  productId,
  successUrl,
  cancelUrl,
}: {
  email: string;
  amount?: number;
  priceId?: string;
  productId?: string;
  successUrl?: string;
  cancelUrl?: string;
}) => {
  try {
    // Call the Supabase Edge Function to create a guest checkout session
    const { data, error } = await supabase.functions.invoke("create-guest-checkout", {
      body: {
        mode: "payment",
        email,
        amount,
        priceId,
        productId,
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
 * Creates a guest checkout session for a specific price
 * @param email Guest user's email
 * @param priceId Stripe Price ID for the product
 */
export const guestCheckoutWithPrice = async (email: string, priceId: string) => {
  return initiateGuestCheckout({ email, priceId });
};

/**
 * Creates a guest checkout session for a custom amount
 * @param email Guest user's email
 * @param amount Amount in dollars (will be converted to cents)
 */
export const guestCheckoutWithAmount = async (email: string, amount: number) => {
  return initiateGuestCheckout({ email, amount });
};
