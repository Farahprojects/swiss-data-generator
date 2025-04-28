
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced logging with better categorization
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details, null, 2)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

// Cache successful verifications to reduce redundant calls
const verificationCache = new Map<string, {
  timestamp: number;
  result: any;
}>();

// For rate limiting management
const RATE_LIMIT_COOLDOWN = 5000; // 5 seconds
const MAX_RETRIES = 3;
const lastRateLimitHit = { timestamp: 0 };

// Sleep function with more meaningful name
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Improved retry operation with better rate limit detection
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  shouldRetry: (error: any) => boolean
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // If we recently hit a rate limit, add a delay before trying again
      if (lastRateLimitHit.timestamp > 0 && Date.now() - lastRateLimitHit.timestamp < RATE_LIMIT_COOLDOWN) {
        const waitTime = RATE_LIMIT_COOLDOWN * Math.pow(2, i);
        logStep(`Rate limit cooldown in effect. Waiting ${waitTime}ms before attempt`);
        await delay(waitTime);
      }
      
      return await operation();
    } catch (error) {
      // Check if it's a rate limit error
      const isRateLimit = error.message?.includes('rate limit') || error.message?.includes('too many requests');
      if (isRateLimit) {
        lastRateLimitHit.timestamp = Date.now();
      }
      
      // Don't retry if it's not retryable or we're on the last attempt
      if (!shouldRetry(error) || i === maxRetries - 1) throw error;
      
      const delayTime = Math.pow(2, i) * 1000; // Exponential backoff
      logStep(`Retry ${i + 1}/${maxRetries} after ${delayTime}ms`, { error: error.message, isRateLimit });
      await delay(delayTime);
    }
  }
  throw new Error("Max retries reached");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting payment verification");
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      logStep("Error: Missing sessionId");
      throw new Error("Session ID is required");
    }
    
    // Check if we have a cached successful verification
    const cached = verificationCache.get(sessionId);
    if (cached && Date.now() - cached.timestamp < 300000) { // Cache valid for 5 minutes
      logStep("Using cached verification result", { sessionId });
      return new Response(
        JSON.stringify(cached.result),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep("Retrieving session", { sessionId });
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription', 'payment_intent', 'line_items']
    });

    if (!session) {
      logStep("Error: No session found");
      throw new Error("Session not found");
    }
    
    logStep("Session retrieved", { 
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email
    });

    // Strict payment status checking
    if (session.payment_status !== 'paid') {
      // Special handling for processing payments
      if (session.payment_status === 'processing') {
        logStep("Payment is still processing", { status: session.payment_status });
        return new Response(
          JSON.stringify({ 
            success: false, 
            status: "processing",
            message: "Your payment is still processing. Please wait a moment and try again."
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 202, // Accepted but not completed
          }
        );
      }
      
      logStep("Warning: Payment not completed", { status: session.payment_status });
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: session.payment_status,
          message: `Payment is not complete (status: ${session.payment_status}). Please complete your payment before proceeding.`
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 402, // Payment Required
        }
      );
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const email = session.customer_details?.email;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const planName = session.metadata?.planType;
    
    if (!email || !customerId) {
      logStep("Error: Missing customer information", { email, customerId });
      throw new Error("Missing customer information");
    }

    // Validate price and plan information
    if (session.line_items?.data && session.line_items.data.length > 0) {
      logStep("Validating pricing information", { 
        planName,
        lineItemsCount: session.line_items.data.length
      });
      // Additional validation could be added here
    }

    // Parse add-ons from metadata with better error handling
    let addOns: string[] = [];
    try {
      if (session.metadata?.addOns) {
        addOns = JSON.parse(session.metadata.addOns);
      }
    } catch (error) {
      logStep("Warning: Error parsing addOns", { error: error.message });
      // Continue with empty addOns rather than failing
    }

    logStep("Preparing stripe user data", { email, planName, addOns });
    
    const stripeUserData = {
      email: email,
      stripe_customer_id: customerId,
      stripe_subscription_id: session.subscription?.id,
      plan_name: planName as 'Starter' | 'Growth' | 'Professional',
      addon_relationship_compatibility: addOns?.includes('Relationship Compatibility') || false,
      addon_yearly_cycle: addOns?.includes('Yearly Cycle') || false,
      addon_transit_12_months: addOns?.includes('Transits') || false,
      payment_status: session.payment_status,
      full_name: session.customer_details?.name || null,
      billing_address_line1: session.customer_details?.address?.line1 || null,
      billing_address_line2: session.customer_details?.address?.line2 || null,
      city: session.customer_details?.address?.city || null,
      state: session.customer_details?.address?.state || null,
      postal_code: session.customer_details?.address?.postal_code || null,
      country: session.customer_details?.address?.country || null,
      phone: session.customer_details?.phone || null,
    };

    logStep("Upserting stripe user data", stripeUserData);

    // Enhanced retry logic - only retry network/timeout errors, not constraint violations
    const shouldRetry = (error: any) => {
      const isConstraintViolation = error.message?.includes('violates unique constraint') || 
                                  error.message?.includes('duplicate key value');
      return !isConstraintViolation;
    };
    
    await retryOperation(async () => {
      const { error: upsertError } = await supabaseAdmin
        .from('stripe_users')
        .upsert(stripeUserData, {
          onConflict: 'stripe_customer_id'
        });

      if (upsertError) {
        logStep("Error upserting stripe user", { error: upsertError });
        throw upsertError;
      }
    }, 3, shouldRetry);
      
    logStep("Successfully saved stripe user data");
    
    const responseData = {
      success: true,
      paymentStatus: session.payment_status,
      email: email,
      customerId: customerId,
      planType: planName
    };
    
    // Cache the successful verification
    verificationCache.set(sessionId, {
      timestamp: Date.now(),
      result: responseData
    });
    
    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Enhanced error handling with more specific information
    let statusCode = 500;
    let errorMessage = error.message || "An unexpected error occurred";
    let errorDetails = "If you continue to experience issues, please contact support.";
    
    // Check for specific error types and customize the message
    if (error.message?.includes('rate limit')) {
      statusCode = 429; // Too Many Requests
      errorMessage = "Rate limit exceeded. Please try again in a few moments.";
      errorDetails = "We've detected high traffic. Please wait a moment before trying again.";
      lastRateLimitHit.timestamp = Date.now();
    } else if (error.message?.includes('Session not found')) {
      statusCode = 404; // Not Found
      errorMessage = "Payment session not found";
      errorDetails = "The payment session may have expired or been canceled.";
    }
    
    logStep("Error verifying payment", { error: errorMessage, status: statusCode });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: errorDetails
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      }
    );
  }
});
