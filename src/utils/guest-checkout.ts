
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
  reportData,
}: {
  email: string;
  amount: number;
  description: string;
  successUrl?: string;
  cancelUrl?: string;
  reportData?: Record<string, any>;
}) => {
  try {
    // Validate required parameters
    if (!email || !amount || !description) {
      throw new Error("Email, amount, and description are required");
    }

    console.log("Initiating guest checkout:", { email, amount, description, reportData });

    // Call the Supabase Edge Function to create a guest checkout session
    // Only pass successUrl and cancelUrl if they are explicitly provided
    const requestBody: any = {
      email,
      amount,
      description,
      reportData, // Pass report data for metadata
    };

    // Only include URLs if they are explicitly provided
    if (successUrl) {
      requestBody.successUrl = successUrl;
    }
    if (cancelUrl) {
      requestBody.cancelUrl = cancelUrl;
    }

    const { data, error } = await supabase.functions.invoke("create-guest-checkout", {
      body: requestBody,
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
 * @param reportData Additional report data to store in session metadata
 */
export const guestCheckoutWithAmount = async (
  email: string, 
  amount: number, 
  description: string,
  reportData?: Record<string, any>
) => {
  // Don't pass any default URLs - let the backend handle them
  return initiateGuestCheckout({ email, amount, description, reportData });
};

/**
 * Verifies a guest payment using the Stripe session ID
 * @param sessionId Stripe checkout session ID
 */
export const verifyGuestPayment = async (sessionId: string) => {
  try {
    console.log("Verifying guest payment:", sessionId);

    const { data, error } = await supabase.functions.invoke("verify-guest-payment", {
      body: { sessionId },
    });

    if (error) {
      console.error("Error verifying guest payment:", error);
      throw new Error(error.message || "Failed to verify payment");
    }

    return data;
  } catch (err) {
    console.error("Failed to verify guest payment:", err);
    return {
      success: false,
      verified: false,
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};
