import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Loader2 } from "lucide-react";
import { plans, addOns, faqs } from "@/utils/pricing";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { storeStripeReturnPath } from "@/utils/stripe-links";
import { supabase } from "@/integrations/supabase/client";

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
  const [loadingAddOn, setLoadingAddOn] = useState<string | null>(null);

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
  
  const handleAddOn = async (addonName: string) => {
    try {
      setLoadingAddOn(addonName);
      
      if (!user) {
        // If user is not logged in, redirect to login
        window.location.href = `/login?redirect=${encodeURIComponent('/pricing')}&addon=${addonName}`;
        return;
      }
      
      // Store current path for return after Stripe checkout
      storeStripeReturnPath(window.location.pathname);
      
      // Get price information based on addon name
      let priceId = '';
      switch(addonName.toLowerCase()) {
        case 'transits':
          priceId = 'price_transits123'; // Replace with your actual price ID
          break;
        case 'relationship':
          priceId = 'price_relationship123'; // Replace with your actual price ID
          break;
        default:
          priceId = '';
      }
      
      if (!priceId) {
        toast.error(`Unknown add-on: ${addonName}`);
        return;
      }
      
      // Use the create-checkout edge function directly
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          mode: "payment",
          priceId: priceId,
          successUrl: window.location.origin + '/payment-return?status=success',
          cancelUrl: window.location.origin + '/payment-return?status=cancelled'
        },
      });
      
      if (error || !data?.url) {
        toast.error(`Could not create checkout session for ${addonName} add-on`);
        console.error("Checkout error:", error || "No URL returned");
        return;
      }
      
      console.log(`Created checkout for ${addonName} add-on:`, data);
      
      // Redirect to the Stripe Checkout URL
      window.location.href = data.url;
    } catch (err) {
      console.error("Failed to add subscription add-on:", err);
      toast.error("There was a problem adding this feature. Please try again.");
    } finally {
      setLoadingAddOn(null);
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
                Fine-Tune Your Insights
              </h2>
              <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600">
                Add-ons bolt seamlessly onto the same API key. Enable them during
                checkout — no extra endpoints, no new auth tokens.
              </p>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {addOns.map((addon) => (
                  <div
                    key={addon.name}
                    className="flex h-full flex-col rounded-xl overflow-hidden border-2 border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-gray-900">{addon.name}</h3>
                        <p className="text-gray-600">{addon.description}</p>
                        <p className="text-4xl font-bold text-primary">{addon.price}</p>
                      </div>

                      <div className="mt-6 flex-grow space-y-3">
                        {addon.details.map((detail, i) => (
                          <div key={i} className="flex items-start gap-2 text-gray-700">
                            <Check className="h-5 w-5 shrink-0 text-primary" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8">
                        <Button 
                          className="w-full bg-primary py-6 text-lg font-medium hover:bg-primary/90"
                          onClick={() => handleAddOn(addon.name)}
                          disabled={loadingAddOn === addon.name}
                        >
                          {loadingAddOn === addon.name ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            addon.status === "included" ? "Included" : "Add for " + addon.price
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
