
import { supabase } from "@/integrations/supabase/client";

export interface ServicePurchaseData {
  title: string;
  description: string;
  price: string;
  coachSlug: string;
  coachName: string;
}

export const parsePrice = (priceString: string): number | null => {
  if (!priceString || typeof priceString !== 'string') return null;
  
  // Remove common currency symbols and extract numbers
  const cleaned = priceString.replace(/[$£€¥₹]/g, '').trim();
  
  // Match patterns like "150", "150.00", "150/session", "$150 per hour"
  const match = cleaned.match(/(\d+(?:\.\d{2})?)/);
  
  if (match) {
    const price = parseFloat(match[1]);
    return price > 0 ? price : null;
  }
  
  return null;
};

export const handleServicePurchase = async (service: ServicePurchaseData, onError?: (error: string) => void) => {
  try {
    const price = parsePrice(service.price);
    
    if (!price) {
      onError?.("Invalid price format");
      return;
    }

    console.log("Initiating service purchase:", { service, price });

    // Use the proven create-checkout function for guest checkout
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        mode: 'payment',
        amount: price,
        description: `${service.title} - ${service.coachName}`,
        isGuest: true,
        email: 'guest@example.com',
        reportData: {
          service_title: service.title,
          service_description: service.description,
          coach_slug: service.coachSlug,
          coach_name: service.coachName,
          service_price: service.price,
          purchase_type: 'service' // This routes to service_purchases table via webhook
        }
      }
    });

    if (error) {
      console.error("Checkout creation failed:", error);
      onError?.(error.message || "Failed to create checkout session");
      return;
    }

    if (data?.url) {
      console.log("Service purchase checkout session created:", data.sessionId);
      
      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
    } else {
      onError?.("No checkout URL received");
    }

  } catch (error: any) {
    console.error("Service purchase error:", error);
    onError?.(error.message || "An unexpected error occurred");
  }
};

export const hasValidPrice = (price: string): boolean => {
  if (!price || typeof price !== 'string') return false;
  
  const lowerPrice = price.toLowerCase();
  
  // Check for contact/inquiry indicators
  if (lowerPrice.includes('contact') || 
      lowerPrice.includes('inquiry') || 
      lowerPrice.includes('quote') ||
      lowerPrice.includes('pricing')) {
    return false;
  }
  
  return parsePrice(price) !== null;
};
