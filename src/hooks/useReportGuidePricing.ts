
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
      essence_personal: getPriceById('essence_personal')?.unit_price_usd || null,
      sync: getPriceById('sync_personal')?.unit_price_usd || null,
      focus: getPriceById('focus')?.unit_price_usd || null,
      monthly: getPriceById('monthly')?.unit_price_usd || null,
      mindset: getPriceById('mindset')?.unit_price_usd || null,
      flow: getPriceById('flow')?.unit_price_usd || null,
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
