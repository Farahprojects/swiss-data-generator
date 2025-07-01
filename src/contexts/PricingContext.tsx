import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  id: string;
  unit_price_usd: number;
  name: string;
  description: string;
  report_type?: string;
}

interface PricingContextType {
  prices: PriceData[];
  isLoading: boolean;
  error: string | null;
  getPriceById: (id: string) => PriceData | null;
  getPriceByReportType: (reportType: string) => PriceData | null;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

interface PricingProviderProps {
  children: ReactNode;
}

export const PricingProvider: React.FC<PricingProviderProps> = ({ children }) => {
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllPrices = async () => {
      // Skip Supabase calls during SSR
      if (typeof window === 'undefined') {
        console.log('🏷️ Skipping price fetch during SSR');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🏷️ Fetching all prices from Supabase...');
        
        const { data, error: fetchError } = await supabase
          .from('price_list')
          .select('id, unit_price_usd, name, description, report_type');

        if (fetchError) {
          console.error('❌ Error fetching prices:', fetchError);
          setError(fetchError.message);
          return;
        }

        if (!data || data.length === 0) {
          console.warn('⚠️ No prices found in price_list table');
          setError('No prices found');
          return;
        }

        console.log('✅ Successfully fetched prices:', data.length, 'items');
        setPrices(data);
        
      } catch (err) {
        console.error('❌ Unexpected error fetching prices:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPrices();
  }, []);

  const getPriceById = (id: string): PriceData | null => {
    const price = prices.find(p => p.id === id);
    if (!price) {
      console.warn('❌ Price not found for ID:', id);
    }
    return price || null;
  };

  const getPriceByReportType = (reportType: string): PriceData | null => {
    const price = prices.find(p => p.report_type === reportType);
    if (!price) {
      console.warn('❌ Price not found for report_type:', reportType);
    }
    return price || null;
  };

  const value: PricingContextType = {
    prices,
    isLoading,
    error,
    getPriceById,
    getPriceByReportType,
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