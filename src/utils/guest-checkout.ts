
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
