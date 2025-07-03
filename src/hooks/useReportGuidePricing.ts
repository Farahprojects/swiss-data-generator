
import { useMemo } from 'react';
import { usePricing } from '@/contexts/PricingContext';

interface ReportGuidePricing {
  [key: string]: number | null;
}

export const useReportGuidePricing = () => {
  const { prices, isLoading, error, getPriceById } = usePricing();

  const pricing = useMemo(() => {
    if (isLoading || prices.length === 0) {
      return {};
    }

    return {
      // Essence pricing
      essence_personal: getPriceById('essence_personal')?.unit_price_usd || null,
      essence_professional: getPriceById('essence_professional')?.unit_price_usd || null,
      essence_relational: getPriceById('essence_relational')?.unit_price_usd || null,
      
      // Sync pricing
      sync_personal: getPriceById('sync_personal')?.unit_price_usd || null,
      sync_professional: getPriceById('sync_professional')?.unit_price_usd || null,
      
      // Snapshot pricing
      focus: getPriceById('focus')?.unit_price_usd || null,
      monthly: getPriceById('monthly')?.unit_price_usd || null,
      mindset: getPriceById('mindset')?.unit_price_usd || null,
      flow: getPriceById('flow')?.unit_price_usd || null,
      
      // Astro Data pricing
      essence: getPriceById('essence')?.unit_price_usd || null,
      sync: getPriceById('sync')?.unit_price_usd || null,
    };
  }, [prices, isLoading, getPriceById]);

  const formatPrice = (price: number | null): string => {
    if (price === null) return 'Contact us';
    return `$${Math.round(price)}`;
  };

  return {
    pricing,
    isLoading,
    error,
    formatPrice,
  };
};
