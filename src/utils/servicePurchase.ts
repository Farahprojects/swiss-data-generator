
import { supabase } from '@/integrations/supabase/client';

export interface ServicePurchaseData {
  title: string;
  description: string;
  price: string;
  coachSlug: string;
  coachName: string;
}

export const hasValidPrice = (price: string): boolean => {
  if (!price) return false;
  const cleanPrice = price.replace(/[$,\s]/g, '');
  const numericPrice = parseFloat(cleanPrice);
  return !isNaN(numericPrice) && numericPrice > 0;
};

export const handleServicePurchase = async (
  serviceData: ServicePurchaseData,
  onError: (error: string) => void
) => {
  try {
    console.log('Processing service purchase:', serviceData);

    // For report services, redirect to vibe page instead of checkout
    if (serviceData.title.toLowerCase().includes('report') || 
        serviceData.title.toLowerCase().includes('insights') ||
        serviceData.title.toLowerCase().includes('assessment')) {
      window.location.href = `/${serviceData.coachSlug}/vibe`;
      return;
    }

    const response = await supabase.functions.invoke('create-service-payment', {
      body: {
        amount: parseFloat(serviceData.price.replace(/[$,\s]/g, '')) * 100,
        email: 'guest@example.com',
        description: `${serviceData.title} - ${serviceData.coachName}`,
        serviceData: serviceData,
      },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (response.data?.url) {
      window.open(response.data.url, '_blank');
    } else {
      throw new Error('No checkout URL received');
    }
  } catch (error) {
    console.error('Service purchase error:', error);
    onError(error instanceof Error ? error.message : 'An unexpected error occurred');
  }
};
