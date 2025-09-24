import React, { useState, useEffect } from 'react';
import TimingToolkitSection from '@/components/pricing/TimingToolkitSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Star, Users, BrainCircuit, Sparkles, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Footer from '@/components/Footer';
import UnifiedNavigation from '@/components/UnifiedNavigation';

interface PricingData {
  id: string;
  name: string;
  description: string;
  unit_price_usd: number;
  product_code: string;
}

const Pricing: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PricingData[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);

  // Fetch all subscription plans
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data, error } = await supabase
          .from('price_list')
          .select('id, name, description, unit_price_usd, product_code')
          .eq('endpoint', 'subscription')
          .order('unit_price_usd', { ascending: true });

        if (error) {
          console.error('Error fetching pricing:', error);
        } else {
          setPricingPlans(data || []);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      } finally {
          setPricingLoading(false);
        }
    };

    fetchPricing();
  }, []);

  const handleUnlock = async (planId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          planId: planId,
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UnifiedNavigation />
      {/* Header Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-light text-gray-900 tracking-tight mb-4">
              Focus Your Energy. Master Your Self.
            </h1>
            <p className="text-xl text-gray-600 font-light max-w-3xl mx-auto">
              Transform the way you reflect, reframe, and act. Our AI-powered system listens, maps, and guides you to breaking your energy patterns, and helps you work deeply on the intentions that matter most—whether for personal growth or professional coaching.
            </p>
          </div>
        </div>
      </div>


      {/* Subscription Plans Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-gray-900 tracking-tight mb-4">
              Choose Your Plan
            </h2>
            <p className="text-lg text-gray-600 font-light max-w-2xl mx-auto">
              Select the perfect plan for your journey
            </p>
          </div>
          
          {pricingLoading ? (
            <div className="flex justify-center">
              <div className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-xl w-80"></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="w-full"
                >
                  <Card className={`border-0 shadow-lg bg-white rounded-3xl overflow-hidden h-full ${
                    plan.id === 'subscription_professional' ? 'ring-2 ring-gray-900' : ''
                  }`}>
                    <CardContent className="p-8 text-center space-y-6 h-full flex flex-col">
                      {/* Icon */}
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                        className="flex items-center justify-center h-12 w-12 mx-auto rounded-full bg-gray-900"
                      >
                        <Sparkles className="h-6 w-6 text-white" />
                      </motion.div>

                      {/* Header */}
                      <div className="space-y-2">
                        <h3 className="text-xl font-light text-gray-900 leading-tight">
                          {plan.name}
                        </h3>
                        <p className="text-2xl font-light text-gray-600">
                          ${plan.unit_price_usd}
                          {plan.id === 'subscription_onetime' ? '' : '/month'}
                        </p>
                      </div>

                      {/* Description */}
                      <div className="flex-grow">
                        <p className="text-sm font-light text-gray-600 leading-relaxed">
                          {plan.description}
                        </p>
                      </div>

                      {/* CTA Button */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                        className="pt-2"
                      >
                        <Button
                          onClick={() => handleUnlock(plan.id)}
                          disabled={loading}
                          className={`w-full font-light py-3 rounded-xl text-base transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 ${
                            plan.id === 'subscription_professional' 
                              ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                              : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
                          }`}
                        >
                          {loading ? 'Processing...' : 'Get Started'}
                        </Button>
                      </motion.div>

                      {/* Security note */}
                      <p className="text-xs text-gray-400 font-light leading-relaxed">
                        Secure payment processed by Stripe. Cancel anytime.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timing Toolkit Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TimingToolkitSection />
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-light text-gray-900 tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600 font-light">
              Everything you need to know about our pricing
            </p>
          </div>
          
          <div className="space-y-8">
            <Card className="shadow-sm border-gray-200 border bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-light text-gray-900">What's the difference between the Personal and Professional plans?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 font-light">
                  The Personal plan gives you 10 intention threads per month, perfect for individual growth. 
                  The Professional plan offers unlimited threads, ideal for coaches working with multiple clients 
                  or power users who want comprehensive insights.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 border bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-light text-gray-900">What is the Single-Intention Pass?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 font-light">
                  Perfect for trying our system! You get one intention thread with 2 months of AI guidance 
                  and insights. No subscription required—it's a one-time purchase to experience how our 
                  energy mapping works.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 border bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-light text-gray-900">What are intention threads?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 font-light">
                  Intention threads are focused conversations where you explore a specific goal or challenge. 
                  Our AI listens, maps your energy patterns, and provides personalized guidance to help you 
                  break through limiting patterns and achieve your intentions.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 border bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-light text-gray-900">Can I upgrade or downgrade my plan?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 font-light">
                  Yes, you can change your subscription at any time. Upgrades take effect immediately, 
                  and downgrades take effect at your next billing cycle. We'll prorate any differences.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 border bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-light text-gray-900">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 font-light">
                  We accept all major credit cards, including Visa, MasterCard, American Express, and Discover, 
                  securely processed by Stripe.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-200 border bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-light text-gray-900">Is my data secure and private?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 font-light">
                  Absolutely. We use industry-standard encryption and security protocols to protect your data. 
                  Your intention threads and personal insights are completely private and never shared.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Pricing;
