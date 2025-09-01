import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Sparkles, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingData {
  name: string;
  description: string;
  unit_price_usd: number;
}

const Pricing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  
  const isCancelled = searchParams.get('subscription') === 'cancelled';

  // Fetch pricing data on component mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data, error } = await supabase
          .from('price_list')
          .select('name, description, unit_price_usd')
          .eq('id', 'subscription1')
          .single();

        if (error) {
          console.error('Error fetching pricing:', error);
          // Fallback to default pricing
          setPricing({
            name: 'Premium Subscription',
            description: 'Unlimited relationship chats and personalized AI insights',
            unit_price_usd: 10.00
          });
        } else {
          setPricing(data);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
        // Fallback to default pricing
        setPricing({
          name: 'Premium Subscription',
          description: 'Unlimited relationship chats and personalized AI insights',
          unit_price_usd: 10.00
        });
      } finally {
        setPricingLoading(false);
      }
    };

    fetchPricing();
  }, []);

  const handleUnlock = async () => {
    if (!pricing) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/pricing`
        }
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error('Failed to create checkout session. Please try again.');
        return;
      }

      if (data?.url) {
        // Redirect to Stripe checkout
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

  if (pricingLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pricing...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-light text-gray-900 mb-4 text-center tracking-tight">
            Try or Subscribe
          </h1>
          <p className="max-w-2xl mx-auto text-center text-lg text-gray-700 mb-10 font-light">
            Unlock your full potential with unlimited access to personalized insights and advanced features.
          </p>
        </div>
      </section>

      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm"
        >
          <Card className="border-0 shadow-lg bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-8 text-center space-y-6">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className={`flex items-center justify-center h-12 w-12 mx-auto rounded-full ${
                  isCancelled ? 'bg-red-100' : 'bg-gray-900'
                }`}
              >
                {isCancelled ? (
                  <XCircle className="h-6 w-6 text-red-600" />
                ) : (
                  <Sparkles className="h-6 w-6 text-white" />
                )}
              </motion.div>

              {/* Header */}
              <div className="space-y-2">
                {isCancelled ? (
                  <>
                    <h1 className="text-2xl font-light text-gray-900 leading-tight">
                      We'd love you to <span className="italic font-light">stay</span>
                    </h1>
                    <p className="text-base font-light text-gray-600">
                      We spent a lot of time and effort building this and would like you to enjoy this app. 
                      Unfortunately we can't make it free.
                    </p>
                  </>
                ) : (
                  <h1 className="text-2xl font-light text-gray-900 leading-tight">
                    Go deeper and unlock your full <span className="italic font-light">insights</span>
                  </h1>
                )}
              </div>

              {/* Body */}
              <div className="space-y-4">
                <p className="text-lg font-light text-gray-600 leading-relaxed">
                  ${pricing?.unit_price_usd}/month — {pricing?.description}
                </p>

                {/* Features list (subtle) */}
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                    <span className="text-xs font-light">Unlimited relationship chats</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                    <span className="text-xs font-light">Personalized AI insights</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                    <span className="text-xs font-light">Advanced relationship analysis</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="pt-3"
              >
                <Button
                  onClick={handleUnlock}
                  disabled={loading}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-light py-3 rounded-xl text-base transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  {loading ? 'Processing...' : isCancelled ? 'Try Again' : 'Unlock'}
                </Button>
              </motion.div>

              {/* Security note */}
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                Secure payment processed by Stripe. Cancel anytime.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-light mb-12 text-center text-gray-900 tracking-tight">
            Common Questions
          </h2>
          
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-light mb-2 text-gray-900 tracking-tight">What's included in the subscription?</h3>
                <p className="text-gray-600 font-light">Get unlimited relationship chats, personalized AI insights, and advanced relationship analysis to help you understand your connections better.</p>
              </div>
              
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-light mb-2 text-gray-900 tracking-tight">Can I cancel anytime?</h3>
                <p className="text-gray-600 font-light">Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.</p>
              </div>
              
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-light mb-2 text-gray-900 tracking-tight">How secure is my data?</h3>
                <p className="text-gray-600 font-light">We use industry-standard encryption and security measures to protect your personal information. Your data is never shared with third parties.</p>
              </div>
              
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-light mb-2 text-gray-900 tracking-tight">How does the AI analysis work?</h3>
                <p className="text-gray-600 font-light">Our AI analyzes patterns in your conversations and provides personalized insights based on relationship psychology and communication science.</p>
              </div>
              
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-xl font-light mb-2 text-gray-900 tracking-tight">Is there a free trial?</h3>
                <p className="text-gray-600 font-light">Yes, you can start with a free trial to explore the features before committing to a subscription.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
