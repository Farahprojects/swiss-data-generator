import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logUtils';

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
        console.log('🏷️ Skipping price fetch');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        log('debug', 'Fetch prices from edge function', null, 'pricing');
        
        // Get Supabase configuration with fallbacks
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://wrvqqvqvwqmfdqvqmaar.supabase.co";
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydnFxdnF2d3FtZmRxdnFtYWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1ODA0NjIsImV4cCI6MjA2MTE1NjQ2Mn0.u9P-SY4kSo7e16I29TXXSOJou5tErfYuldrr_CITWX0";
        
        console.log('🔧 Using Supabase URL:', supabaseUrl);
        
        // Call the get-prices edge function instead of direct table access
        const response = await fetch(`${supabaseUrl}/functions/v1/get-prices`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
          console.error('❌ Error fetching prices:', result.error);
          setError(result.error);
          return;
        }

        if (!result.prices || result.prices.length === 0) {
          console.warn('⚠️ No prices found in price_list table');
          setError('No prices found');
          return;
        }

        setPrices(result.prices);
        console.log(`✅ Successfully loaded ${result.prices.length} prices`);
        
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
    return prices.find(p => p.id === id) || null;
  };

  const getPriceByReportType = (reportType: string): PriceData | null => {
    return prices.find(p => p.report_type === reportType) || null;
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
