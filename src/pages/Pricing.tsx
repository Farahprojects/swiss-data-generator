import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Loader2 } from "lucide-react";
import { plans, faqs } from "@/utils/pricing";
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

const PricingPlanCard = ({
  name,
  price,
  description,
  features,
  highlight = false,
  icon,
  onSubscribe,
  isLoading = false,
}: {
  name: React.ReactNode;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
  icon?: React.ReactNode;
  onSubscribe: () => void;
  isLoading?: boolean;
}) => {
  return (
    <div
      className={`flex h-full flex-col rounded-xl overflow-hidden border-2 ${
        highlight ? "border-primary" : "border-gray-100"
      } bg-white shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
      <div className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {icon && <span className="text-2xl text-primary">{icon}</span>}
            <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
          </div>
          <p className="text-gray-600">{description}</p>
          <p className="text-4xl font-bold text-primary">{price}</p>
        </div>

        <div className="mt-6 flex-grow space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-gray-700">
              <Check className="h-5 w-5 shrink-0 text-primary" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Button 
            className="w-full bg-primary py-6 text-lg font-medium hover:bg-primary/90"
            onClick={onSubscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Start Free Trial"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
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

  // Group prices by report_tier only - removing the API Endpoints category
  const groupedPrices = prices.reduce((acc, price) => {
    let category;
    
    if (price.report_tier) {
      category = 'Reports';
    } else {
      category = 'Other Services'; // All other items go here
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push(price);
    return acc;
  }, {} as Record<string, PriceItem[]>);

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

  const handleSubscribe = async (planType: string) => {
    try {
      setLoadingPlan(planType);
      
      if (!user) {
        // If user is not logged in, redirect to login
        window.location.href = `/login?redirect=${encodeURIComponent('/pricing')}&plan=${planType}`;
        return;
      }
      
      // Store current path for return after Stripe checkout
      storeStripeReturnPath(window.location.pathname);
      
      // Get price information based on plan type
      let priceId = '';
      switch(planType.toLowerCase()) {
        case 'starter':
          priceId = 'price_starter123'; // Replace with your actual price ID
          break;
        case 'growth':
          priceId = 'price_growth123'; // Replace with your actual price ID
          break;
        case 'professional':
          priceId = 'price_pro123'; // Replace with your actual price ID
          break;
        default:
          priceId = 'price_starter123'; // Default price ID
      }
      
      // Use the create-checkout edge function directly
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          mode: "subscription",
          priceId: priceId,
          successUrl: window.location.origin + '/payment-return?status=success',
          cancelUrl: window.location.origin + '/payment-return?status=cancelled'
        },
      });
      
      if (error || !data?.url) {
        toast.error(`Could not create checkout session for ${planType} plan`);
        console.error("Checkout error:", error || "No URL returned");
        return;
      }
      
      console.log(`Created checkout for ${planType} plan:`, data);
      
      // Redirect to the Stripe Checkout URL
      window.location.href = data.url;
    } catch (err) {
      console.error("Failed to start subscription:", err);
      toast.error("There was a problem starting your subscription. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <header className="py-20 text-center">
        <h1 className="mb-6 text-4xl font-bold text-primary">
          All The Cosmos in one API key
        </h1>
        <p className="mx-auto max-w-3xl text-xl text-gray-700">
          Predict. Match. Innovate. Our Swiss-Ephemeris engine delivers every
          astrological calculation through a single, developer-friendly endpoint.
          Choose the usage tier that fits today and scale effortlessly tomorrow.
        </p>
      </header>

      <main className="flex-grow">
        <section className="container mx-auto -mt-10 py-20 px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {plans.map((p) => (
              <PricingPlanCard 
                key={p.name.toString()} 
                {...p} 
                onSubscribe={() => handleSubscribe(typeof p.name === 'string' ? p.name : 'Starter')}
                isLoading={loadingPlan === (typeof p.name === 'string' ? p.name : 'Starter')}
              />
            ))}
          </div>

          <section className="mt-20 rounded-xl bg-gray-50 py-16">
            <div className="container mx-auto px-4">
              <h2 className="mb-4 text-center text-4xl font-bold text-primary">
                API Pricing
              </h2>
              <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600">
                Our transparent pricing ensures you only pay for what you use, with no hidden fees or charges.
              </p>

              <div className="mt-4 mb-8">
                <h3 className="font-medium text-lg mb-2 text-center">All prices include:</h3>
                <ul className="grid gap-y-2 gap-x-6 sm:grid-cols-2 max-w-2xl mx-auto">
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
              ) : Object.keys(groupedPrices).length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No pricing information available at this time.
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedPrices).map(([category, items]) => (
                    <Card key={category} className="overflow-hidden border-2 border-gray-100">
                      <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
                      <CardHeader className="bg-gray-50 border-b pb-3">
                        <CardTitle>{category}</CardTitle>
                        <CardDescription>
                          {category === 'Reports' && 'Pricing for different report types'}
                          {category === 'Other Services' && 'Additional services and features'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {items.map((price) => (
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
                  ))}
                  
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
          Ready to launch cosmic features?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-xl">
          Start your free 14-day trial now — no credit card required.
        </p>
        <Button 
          className="bg-white px-8 py-6 text-lg text-primary hover:bg-gray-100"
          onClick={() => handleSubscribe('Starter')}
          disabled={loadingPlan === 'Starter'}
        >
          {loadingPlan === 'Starter' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Start Free Trial"
          )}
        </Button>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
