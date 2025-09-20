import React from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface PriceData {
  id: string;
  unit_price_usd: number;
  name: string;
  description: string;
  report_type?: string;
  is_ai?: boolean;
}

export interface TrustedPricingObject {
  valid: boolean;
  promo_code_id?: string;
  discount_usd: number;
  trusted_base_price_usd: number;
  final_price_usd: number;
  report_type: string;
  reason?: string;
}

// Global cache
let cachedPrices: PriceData[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Use shared Supabase client singleton

/**
 * 🎯 Centralized Pricing Service
 * Fetches prices once and caches them for all components
 */
class PricingService {
  private static instance: PricingService;
  private prices: PriceData[] = [];
  private isLoading = false;
  private error: string | null = null;
  private subscribers: Set<(prices: PriceData[], error: string | null) => void> = new Set();

  private constructor() {}

  static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  /**
   * Subscribe to price updates
   */
  subscribe(callback: (prices: PriceData[], error: string | null) => void): () => void {
    this.subscribers.add(callback);
    
    // Immediately call with current state
    callback(this.prices, this.error);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      callback(this.prices, this.error);
    });
  }

  /**
   * Fetch prices from edge function (with caching)
   */
  async fetchPrices(): Promise<PriceData[]> {
    // Return cached data if still valid
    if (cachedPrices && (Date.now() - lastFetchTime) < CACHE_DURATION) {
      return cachedPrices;
    }

    // If already loading, wait for current request
    if (this.isLoading) {
      return new Promise((resolve, reject) => {
        const checkComplete = () => {
          if (!this.isLoading) {
            if (this.error) {
              reject(new Error(this.error));
            } else {
              resolve(this.prices);
            }
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });
    }

    this.isLoading = true;
    this.error = null;
    this.notifySubscribers();

    try {
      const { data, error } = await supabase.functions.invoke('get-prices');
      if (error) {
        throw new Error(error.message);
      }
      const result = data as { prices: PriceData[]; error?: string };

      if (!result.prices || result.prices.length === 0) {
        throw new Error('No prices found');
      }

      // Update cache
      cachedPrices = result.prices;
      lastFetchTime = Date.now();
      this.prices = result.prices;
      
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error fetching prices:', this.error);
      throw error;
    } finally {
      this.isLoading = false;
      this.notifySubscribers();
    }

    return this.prices;
  }

  /**
   * Get price by ID
   */
  getPriceById(id: string): PriceData | null {
    return this.prices.find(p => p.id === id) || null;
  }

  /**
   * Get price by report type
   */
  getPriceByReportType(reportType: string): PriceData | null {
    return this.prices.find(p => p.report_type === reportType) || null;
  }

  /**
   * Get all prices
   */
  getAllPrices(): PriceData[] {
    return this.prices;
  }

  /**
   * Get loading state
   */
  getLoadingState(): boolean {
    return this.isLoading;
  }

  /**
   * Get error state
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Clear cache (force refresh)
   */
  clearCache(): void {
    cachedPrices = null;
    lastFetchTime = 0;
  }
}

// Export singleton instance
export const pricingService = PricingService.getInstance();

// React hook for easy integration
export const usePricing = () => {
  const [prices, setPrices] = React.useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Subscribe to pricing service updates
    const unsubscribe = pricingService.subscribe((newPrices, newError) => {
      setPrices(newPrices);
      setError(newError);
      setIsLoading(pricingService.getLoadingState());
    });

    // Trigger initial fetch if needed
    if (prices.length === 0 && !isLoading && !error) {
      pricingService.fetchPrices().catch(console.error);
    }

    return unsubscribe;
  }, []);

  return {
    prices,
    isLoading,
    error,
    getPriceById: (id: string) => pricingService.getPriceById(id),
    getPriceByReportType: (reportType: string) => pricingService.getPriceByReportType(reportType),
    getAllPrices: () => pricingService.getAllPrices(),
    refresh: () => {
      pricingService.clearCache();
      return pricingService.fetchPrices();
    }
  };
};
