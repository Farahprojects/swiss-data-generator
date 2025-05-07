import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Loader2 } from "lucide-react";
import { plans, addOns, faqs } from "@/utils/pricing";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getStripeLinkByName, getStandardLinkName, STRIPE_LINK_TYPES } from "@/utils/stripe-links";

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
      className={`flex h-full flex-col rounded-xl p-6 ${
        highlight ? "ring-2 ring-primary" : "border border-gray-200"
      } bg-white shadow-sm transition-shadow hover:shadow-md`}
    >
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
      
      // Get link for the selected plan from the database
      const linkName = getStandardLinkName(STRIPE_LINK_TYPES.PLAN_PREFIX, planType);
      const planLink = await getStripeLinkByName(linkName);
      
      if (!planLink || !planLink.url) {
        toast.error(`Could not find checkout link for ${planType} plan`);
        return;
      }
      
      console.log(`Found link for ${planType} plan:`, planLink);
      
      // Redirect to the Stripe Checkout link
      window.location.href = planLink.url;
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
      
      // Get link for the selected add-on from the database
      const linkName = getStandardLinkName(STRIPE_LINK_TYPES.ADDON_PREFIX, addonName);
      const addonLink = await getStripeLinkByName(linkName);
      
      if (!addonLink || !addonLink.url) {
        toast.error(`Could not find checkout link for ${addonName} add-on`);
        return;
      }
      
      console.log(`Found link for ${addonName} add-on:`, addonLink);
      
      // Redirect to the Stripe Checkout link
      window.location.href = addonLink.url;
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
                  <PricingPlanCard 
                    key={addon.name}
                    name={addon.name}
                    price={addon.price}
                    description={addon.description}
                    features={addon.details}
                    onSubscribe={() => handleAddOn(addon.name)}
                    isLoading={loadingAddOn === addon.name}
                  />
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
