
import { supabase } from "@/integrations/supabase/client";
import { storeStripeReturnPath } from "./stripe-links";

/**
 * Creates a Stripe checkout session and redirects the user
 * @param options Configuration for the checkout session
 */
export const initiateStripeCheckout = async ({
  mode = "payment",
  amount,
  priceId,
  productId,
  successUrl,
  cancelUrl,
}: {
  mode?: "payment" | "setup";
  amount?: number;
  priceId?: string;
  productId?: string;
  successUrl?: string;
  cancelUrl?: string;
}) => {
  try {
    // Store the current path for return after Stripe checkout
    const currentPath = window.location.pathname + window.location.search;
    storeStripeReturnPath(currentPath);
    
    // Call the Supabase Edge Function to create a checkout session
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        mode,
        amount,
        priceId,
        productId,
        successUrl,
        cancelUrl,
        returnPath: currentPath,
      },
    });

    if (error) {
      console.error("Error creating Stripe checkout session:", error);
      throw new Error(error.message || "Failed to create checkout session");
    }

    if (!data?.url) {
      throw new Error("No checkout URL returned from server");
    }

    // Redirect to the Stripe checkout URL
    window.location.href = data.url;
    return { success: true };
  } catch (err) {
    console.error("Failed to initiate Stripe checkout:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error occurred" 
    };
  }
};

/**
 * Creates a Stripe checkout session for updating payment method
 */
export const updatePaymentMethod = async () => {
  return initiateStripeCheckout({ mode: "setup" });
};

/**
 * Creates a Stripe checkout session for a one-time payment
 * @param amount Amount in dollars (will be converted to cents)
 */
export const makeOneTimePayment = async (amount: number) => {
  return initiateStripeCheckout({ mode: "payment", amount });
};

/**
 * Creates a Stripe checkout session for a subscription
 * @param priceId Stripe Price ID for the subscription
 */
export const subscribeToProduct = async (priceId: string) => {
  return initiateStripeCheckout({ mode: "payment", priceId });
};
