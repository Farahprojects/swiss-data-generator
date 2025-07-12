
import { supabase } from "@/integrations/supabase/client";
import { ReportFormData } from "@/types/public-report";
import { logToAdmin } from "./adminLogger";

export interface GuestCheckoutOptions {
  amount: number;
  email: string;
  description: string;
  reportData?: ReportFormData & { coachSlug?: string };
  successUrl?: string;
  cancelUrl?: string;
}

export const initiateGuestCheckout = async ({
  amount,
  email,
  description,
  reportData,
  successUrl,
  cancelUrl,
}: GuestCheckoutOptions) => {
  try {
    // Log entry into guest checkout
    await logToAdmin('guest-checkout', 'initiate_entry', 'initiateGuestCheckout called', {
      amount: amount,
      email: email,
      description: description,
      hasReportData: !!reportData,
      reportType: reportData?.reportType || null,
      request: reportData?.request || null,
      coachSlug: reportData?.coachSlug || null
    });

    console.log("🔄 Initiating guest checkout with unified function:", {
      amount,
      email,
      description,
      hasReportData: !!reportData,
      coachSlug: reportData?.coachSlug
    });

    const checkoutPayload = {
      mode: "payment",
      amount,
      email,
      isGuest: true,
      description,
      reportData,
      successUrl,
      cancelUrl,
    };

    // Log the payload being sent to Supabase function
    await logToAdmin('guest-checkout', 'calling_supabase_function', 'Calling create-checkout function', {
      payload: {
        mode: checkoutPayload.mode,
        amount: checkoutPayload.amount,
        email: checkoutPayload.email,
        isGuest: checkoutPayload.isGuest,
        description: checkoutPayload.description,
        hasReportData: !!checkoutPayload.reportData
      }
    });

    // Call the unified create-checkout function with isGuest flag
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: checkoutPayload,
    });

    // Log the response from Supabase function
    await logToAdmin('guest-checkout', 'supabase_function_response', 'Response from create-checkout function', {
      hasData: !!data,
      hasError: !!error,
      error: error ? String(error) : null,
      hasUrl: !!(data?.url)
    });

    if (error) {
      console.error("❌ Error creating guest checkout session:", error);
      throw new Error(error.message || "Failed to create checkout session");
    }

    if (!data?.url) {
      throw new Error("No checkout URL returned from server");
    }

    console.log("✅ Guest checkout session created successfully");

    // Log successful redirect attempt
    await logToAdmin('guest-checkout', 'redirect_attempt', 'Attempting to redirect to Stripe', {
      url: data.url
    });

    // Fixed redirect method for Chrome mobile compatibility
    try {
      // First try opening in same tab (preferred for mobile)
      window.open(data.url, '_self');
    } catch (redirectError) {
      console.warn("Failed to redirect with window.open, falling back to location.href");
      // Fallback to location.href if window.open fails
      window.location.href = data.url;
    }
    
    return { success: true };
  } catch (err) {
    // Log the error
    await logToAdmin('guest-checkout', 'error', 'Error in initiateGuestCheckout', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : null
    });

    console.error("❌ Failed to initiate guest checkout:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error occurred" 
    };
  }
};

export const verifyGuestPayment = async (sessionId: string) => {
  try {
    console.log("🔍 Verifying guest payment for session:", sessionId);

    const { data, error } = await supabase.functions.invoke("verify-guest-payment", {
      body: { sessionId },
    });

    if (error) {
      console.error("❌ Error verifying guest payment:", error);
      return {
        success: false,
        verified: false,
        error: error.message || "Failed to verify payment"
      };
    }

    console.log("✅ Guest payment verification result:", data);
    
    // Return all properties from the edge function response
    return {
      success: true,
      verified: data.verified,
      reportData: data.reportData,
      guestReportId: data.guestReportId,
      paymentStatus: data.paymentStatus,
      amountPaid: data.amountPaid,
      currency: data.currency,
      isService: data.isService,
      isCoachReport: data.isCoachReport,
      coach_slug: data.coach_slug,
      coach_name: data.coach_name,
      service_title: data.service_title,
      swissProcessing: data.swissProcessing,
      message: data.message,
      error: data.error
    };
  } catch (err) {
    console.error("❌ Failed to verify guest payment:", err);
    return {
      success: false,
      verified: false,
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
};
