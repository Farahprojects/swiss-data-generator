
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

type PriceItem = {
  id: string;
  name: string;
  description: string | null;
  report_tier: string | null;
  endpoint: string | null;
  unit_price_usd: number;
};

export const PricingPage = () => {
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('price_list')
          .select('*')
          .order('unit_price_usd', { ascending: true });

        if (error) {
          throw error;
        }

        setPrices(data || []);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError('Failed to load pricing information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  // Group prices by report_tier only - removing the API Endpoints category
  const groupedPrices = prices.reduce((acc, price) => {
    let category;
    
    if (price.report_tier) {
      category = 'Report Tiers';
    } else {
      category = 'Other Services'; // All other items go here
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push(price);
    return acc;
  }, {} as Record<string, PriceItem[]>);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="ml-2">Loading pricing information...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  // Format price to correctly display dollar amounts
  const formatPrice = (price: number): string => {
    // If price is a whole dollar amount (e.g., 1, 5, 10)
    if (price >= 1 && price % 1 === 0) {
      return `$${price.toFixed(0)}`;
    }
    // For prices with cents like 0.05, show up to 2 decimal places (e.g., $0.05)
    else if (price < 1) {
      // Ensure we show 2 decimal places for cents but remove trailing zeros
      return `$${price.toFixed(2).replace(/\.?0+$/, '')}`;
    }
    // For prices with dollars and cents (e.g., 1.50)
    else {
      return `$${price.toFixed(2).replace(/\.?0+$/, '')}`;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Pricing</h1>
        <p className="text-gray-600 mb-4">
          Our transparent pricing ensures you only pay for what you use, with no hidden fees or charges.
        </p>
        
        <div className="mt-4">
          <h3 className="font-medium text-lg mb-2">All prices include:</h3>
          <ul className="grid gap-y-2 gap-x-6 sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              <span>Pay-as-you-go billing</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              <span>Direct API access</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              <span>Usage-based pricing</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">•</span>
              <span>No long-term commitments</span>
            </li>
          </ul>
        </div>
      </div>
      
      {Object.keys(groupedPrices).length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No pricing information available at this time.
        </div>
      ) : (
        Object.entries(groupedPrices).map(([category, items]) => (
          <Card key={category} className="overflow-hidden border-2 border-gray-100">
            <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
            <CardHeader className="bg-gray-50 border-b pb-3">
              <CardTitle>{category}</CardTitle>
              <CardDescription>
                {category === 'Report Tiers' && 'Pricing for different report complexity levels'}
                {category === 'Other Services' && 'Additional services and features'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((price) => (
                  <div key={price.id} className="bg-white p-5 rounded-lg border-2 border-gray-100 hover:shadow-md transition-shadow duration-200 flex flex-col h-full overflow-hidden">
                    <div className="bg-gradient-to-r from-primary/10 to-transparent p-1 -mx-5 -mt-5 mb-4"></div>
                    <div className="flex-grow">
                      <h3 className="text-lg font-medium text-gray-900">{price.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{price.description || 'Standard pricing'}</p>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="text-center mt-auto">
                      <Badge variant="outline" className="text-primary border-primary text-lg px-4 py-1">
                        {formatPrice(price.unit_price_usd)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
      
      <Card className="overflow-hidden border-2 border-gray-100">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
        <CardHeader className="pb-3">
          <CardTitle>Volume Discounts</CardTitle>
          <CardDescription>Benefit from reduced pricing with higher usage volumes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Contact our sales team to discuss custom pricing for high-volume API usage. 
            We offer customized solutions and volume discounts for enterprise customers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
