import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingData {
  id: string;
  name: string;
  description: string;
  unit_price_usd: number;
  product_code: string;
}

const SubscriptionPaywall: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PricingData | null>(null);
  
  const isCancelled = searchParams.get('subscription') === 'cancelled';

  // Fetch the annual subscription plan
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data, error } = await supabase
          .from('price_list')
          .select('id, name, description, unit_price_usd, product_code')
          .eq('endpoint', 'subscription')
          .single();

        if (error) {
          console.error('Error fetching pricing:', error);
        } else {
          setPlan(data);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      }
    };

    fetchPricing();
  }, []);

  const handleSubscribe = async () => {
    if (!plan) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          priceId: plan.id,
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/subscription-paywall`
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error('Failed to create checkout session. Please try again.');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('No checkout URL received. Please try again.');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'Unlimited Swiss data generation',
    'All chart types (Natal, Transits, Progressions)',
    'Access to system prompts library',
    'JSON output for AI integration',
    'One year of access',
    'Cancel anytime'
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      
      {/* Simple Header */}
      <header className="w-full py-6 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-2xl font-light italic text-gray-900">
            Swiss Data Generator
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        <div className="w-full max-w-2xl">
          
          {/* Header */}
          <div className="text-center mb-12">
            {isCancelled ? (
              <>
                <h1 className="text-4xl font-light italic text-gray-900 mb-4">
                  Come Back
                </h1>
                <p className="text-lg text-gray-600 font-light">
                  We'd love to have you as part of Swiss Data Generator. 
                  Just $30 for a full year of unlimited access.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-light italic text-gray-900 mb-4">
                  Subscribe to Continue
                </h1>
                <p className="text-lg text-gray-600 font-light">
                  Get unlimited Swiss astrology data generation for one year
                </p>
              </>
            )}
          </div>

          {/* Pricing Card */}
          {plan ? (
            <Card className="border-2 border-gray-900 shadow-xl rounded-3xl overflow-hidden">
              <CardContent className="p-12 text-center space-y-8">
                
                {/* Icon */}
                <div className="flex items-center justify-center h-16 w-16 mx-auto rounded-full bg-gray-900">
                  <Database className="h-8 w-8 text-white" />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <h3 className="text-3xl font-light text-gray-900">
                    {plan.name}
                  </h3>
                  <div className="text-5xl font-light text-gray-900">
                    ${plan.unit_price_usd}
                    <span className="text-2xl text-gray-600">/year</span>
                  </div>
                  <p className="text-sm text-gray-600 font-light">
                    {plan.description}
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-3 text-left max-w-md mx-auto">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 font-light">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-light py-6 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? 'Processing...' : isCancelled ? 'Subscribe Now' : 'Get Started'}
                </Button>

                {/* Security note */}
                <p className="text-xs text-gray-500 font-light">
                  Secure payment processed by Stripe. Cancel anytime from your settings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-gray-400">
              Loading...
            </div>
          )}

        </div>
      </main>

      <footer className="py-6 text-center text-sm text-gray-500 font-light border-t border-gray-200">
        © {new Date().getFullYear()} Swiss Data Generator. All rights reserved.
      </footer>
    </div>
  );
};

export default SubscriptionPaywall;
