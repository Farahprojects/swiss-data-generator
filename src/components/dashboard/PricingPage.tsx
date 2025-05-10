
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2 } from "lucide-react";

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

  // Group prices by endpoint or report_tier
  const groupedPrices = prices.reduce((acc, price) => {
    let category;
    
    if (price.report_tier) {
      category = 'Report Tiers';
    } else if (price.endpoint) {
      category = 'API Endpoints';
    } else {
      category = 'Other Services';
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Pricing</h1>
        <p className="text-gray-600">
          Our transparent pricing ensures you only pay for what you use, with no hidden fees or charges.
        </p>
      </div>
      
      {Object.keys(groupedPrices).length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No pricing information available at this time.
        </div>
      ) : (
        Object.entries(groupedPrices).map(([category, items]) => (
          <Card key={category} className="overflow-hidden">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle>{category}</CardTitle>
              <CardDescription>
                {category === 'Report Tiers' && 'Pricing for different report complexity levels'}
                {category === 'API Endpoints' && 'Pricing for specific API endpoints and features'}
                {category === 'Other Services' && 'Additional services and features'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((price) => (
                  <div key={price.id} className="bg-white p-5 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">{price.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{price.description || 'Standard pricing'}</p>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary">
                        ${price.unit_price_usd.toFixed(4)}
                      </Badge>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Pay-as-you-go billing</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Direct API access</span>
                      </div>
                      {price.report_tier && (
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>Report tier: {price.report_tier}</span>
                        </div>
                      )}
                      {price.endpoint && (
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span>Endpoint: {price.endpoint}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
      
      <Card>
        <CardHeader>
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
