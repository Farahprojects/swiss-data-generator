
import { supabase } from "@/integrations/supabase/client";
import { ReportFormData } from "@/types/public-report";

export interface GuestCheckoutOptions {
  amount: number;
  email: string;
  description: string;
  reportData?: ReportFormData;
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
    console.log("🔄 Initiating guest checkout with unified function:", {
      amount,
      email,
      description,
      hasReportData: !!reportData
    });

    // Call the unified create-checkout function with isGuest flag
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        mode: "payment",
        amount,
        email,
        isGuest: true,
        description,
        reportData,
        successUrl,
        cancelUrl,
      },
    });

    if (error) {
      console.error("❌ Error creating guest checkout session:", error);
      throw new Error(error.message || "Failed to create checkout session");
    }

    if (!data?.url) {
      throw new Error("No checkout URL returned from server");
    }

    console.log("✅ Guest checkout session created successfully");

    // Redirect to the Stripe checkout URL
    window.location.href = data.url;
    return { success: true };
  } catch (err) {
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
