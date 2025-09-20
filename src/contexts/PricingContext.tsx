import React, { createContext, useContext, ReactNode } from 'react';
import { pricingService, usePricing as usePricingService } from '@/services/pricing';

// Re-export types from the service
export type { PriceData, TrustedPricingObject } from '@/services/pricing';

interface PricingContextType {
  prices: any[];
  isLoading: boolean;
  error: string | null;
  getPriceById: (id: string) => any | null;
  getPriceByReportType: (reportType: string) => any | null;
  getAllPrices: () => any[];
  refresh: () => Promise<any[]>;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

interface PricingProviderProps {
  children: ReactNode;
}

export const PricingProvider: React.FC<PricingProviderProps> = ({ children }) => {
  // Use the centralized pricing service
  const pricingData = usePricingService();

  const value: PricingContextType = {
    prices: pricingData.prices,
    isLoading: pricingData.isLoading,
    error: pricingData.error,
    getPriceById: pricingData.getPriceById,
    getPriceByReportType: pricingData.getPriceByReportType,
    getAllPrices: pricingData.getAllPrices,
    refresh: pricingData.refresh,
  };

  return (
    <PricingContext.Provider value={value}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricing = (): PricingContextType => {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
};
