import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Loader2 } from "lucide-react";
import { faqs } from "@/utils/pricing";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { storeStripeReturnPath } from "@/utils/stripe-links";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type PriceItem = {
  id: string;
  name: string;
  description: string | null;
  report_tier: string | null;
  endpoint: string | null;
  unit_price_usd: number;
};

const FAQSection = ({ items }: { items: { question: string; answer: string }[] }) => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
        
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6">
            {items.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-6">
              Have more questions about our API or pricing?
            </p>
            <Link to="/contact">
              <Button variant="outline">Contact Us</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  const { user } = useAuth();
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setPricesLoading(true);
        const { data, error } = await supabase
          .from('price_list')
          .select('*')
          .not('report_tier', 'is', null) // Only get items that have a report_tier (reports only)
          .order('unit_price_usd', { ascending: true });

        if (error) {
          throw error;
        }

        setPrices(data || []);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setPricesError('Failed to load pricing information. Please try again later.');
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, []);

  // Function to format report names to match dropdown list
  const formatReportName = (name: string): string => {
    const nameMap: Record<string, string> = {
      'return': 'Solar/Lunar Return Report',
      'positions': 'Planetary Positions',
      'sync': 'Sync Report',
      'essence': 'Essence Report',
      'flow': 'Flow Report',
      'mindset': 'Mindset Report',
      'monthly': 'Monthly Report',
      'focus': 'Focus Report'
    };
    
    // If the name exists in our map, use the formatted version
    if (nameMap[name.toLowerCase()]) {
      return nameMap[name.toLowerCase()];
    }
    
    // Otherwise, just replace underscores with spaces and capitalize
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-grow">
        <section className="container mx-auto py-20 px-4">
          <section className="rounded-xl bg-gray-50 py-16">
            <div className="container mx-auto px-4">
              <h2 className="mb-4 text-center text-4xl font-bold text-primary">
                Deep Insights to Unlock the Subconscious
              </h2>
              <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600">
                Transform data into profound understanding with our astrological insights API. 
                Access the hidden patterns that reveal personality depths, relationship dynamics, 
                and life purpose through precise cosmic calculations.
              </p>

              <div className="mt-4 mb-8">
                <h3 className="font-medium text-lg mb-2 text-center">Every insight includes:</h3>
                <ul className="grid gap-y-2 gap-x-6 sm:grid-cols-2 max-w-2xl mx-auto">
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    <span>Subconscious pattern analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    <span>Precision Swiss-Ephemeris data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    <span>Pay-per-insight pricing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-primary">•</span>
                    <span>No subscriptions required</span>
                  </li>
                </ul>
              </div>

              {pricesLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <span className="ml-2">Loading pricing information...</span>
                </div>
              ) : pricesError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Error: </strong> 
                  <span className="block sm:inline">{pricesError}</span>
                </div>
              ) : prices.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No pricing information available at this time.
                </div>
              ) : (
                <div className="space-y-8">
                  <Card className="overflow-hidden border-2 border-gray-100">
                    <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
                    <CardHeader className="bg-gray-50 border-b pb-3">
                      <CardTitle>Reports & Insights</CardTitle>
                      <CardDescription>
                        Pricing for different astrological reports and insights
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {prices.map((price) => (
                          <div key={price.id} className="bg-white p-5 rounded-lg border-2 border-gray-100 hover:shadow-md transition-shadow duration-200 flex flex-col h-full overflow-hidden">
                            <div className="bg-gradient-to-r from-primary/10 to-transparent p-1 -mx-5 -mt-5 mb-4"></div>
                            <div className="flex-grow">
                              <h3 className="text-lg font-medium text-gray-900">{formatReportName(price.name)}</h3>
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
              )}
            </div>
          </section>

          <FAQSection items={faqs} />
        </section>
      </main>

      <section className="bg-primary py-16 text-center text-white">
        <h2 className="mb-6 text-3xl font-bold">
          Ready to unlock cosmic insights?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-xl">
          Start revealing the hidden patterns that shape personality and destiny — pay only for the insights you generate.
        </p>
        <Link to={user ? "/dashboard" : "/login"}>
          <Button className="bg-white px-8 py-6 text-lg text-primary hover:bg-gray-100">
            {user ? "Go to Dashboard" : "Get Started"}
          </Button>
        </Link>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
