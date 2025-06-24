
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

    const { data, error } = await supabase.functions.invoke('create-guest-checkout', {
      body: {
        amount: price,
        email: 'guest@example.com', // Default for guest checkout
        description: `${service.title} - ${service.coachName}`,
        reportData: {
          service_title: service.title,
          service_description: service.description,
          coach_slug: service.coachSlug,
          coach_name: service.coachName,
          service_price: service.price,
          purchase_type: 'service'
        }
      }
    });

    if (error) {
      console.error("Checkout creation failed:", error);
      onError?.(error.message || "Failed to create checkout session");
      return;
    }

    if (data?.url) {
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
