
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { PricingPlan, AddOnCard, CheckoutProvider } from "@/components/pricing/PaymentComponents";
import { FAQSection } from "@/components/pricing/FAQSection";
import { plans, addOns, faqs } from "@/utils/pricing";

const Pricing = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t0 = performance.now();
    // Fix: replace listFunctions with a simple ping to check API connection
    supabase.auth.getSession()
      .catch((e) => console.error("Supabase ping failed", e))
      .finally(() => {
        setIsLoading(false);
        console.log(`Pricing page ready in ${(performance.now() - t0).toFixed(1)} ms`);
      });
  }, []);

  return (
    <CheckoutProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow">
          {/* Header */}
          <section className="bg-accent py-20 text-center">
            <h1 className="mb-6 text-4xl font-bold">Simple, Transparent Pricing</h1>
            <p className="mx-auto max-w-3xl text-xl text-gray-700">
              All plans unlock our Swiss-Ephemeris API. Upgrade only when your traffic grows.
            </p>
          </section>

          {/* Pricing cards */}
          <section className="py-20 -mt-10">
            <div className="container mx-auto px-4">
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-lg">Loading …</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {plans.map((p) => (
                      <PricingPlan key={p.name} {...p} />
                    ))}
                  </div>

                  {/* Add-ons */}
                  <section className="mt-16 bg-gray-50 py-16">
                    <div className="container mx-auto px-4">
                      <div className="mx-auto mb-12 max-w-3xl text-center">
                        <h2 className="mb-4 text-4xl font-bold text-primary">
                          Optional Add-Ons
                        </h2>
                        <p className="text-lg text-gray-600">
                          Add-ons can be toggled during checkout. No extra API calls, just more
                          insight.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {addOns.map((a) => (
                          <AddOnCard 
                            key={a.name} 
                            name={a.name}
                            price={a.price}
                            description={a.description}
                            details={a.details}
                            status={a.status as "included" | "upgrade"}
                          />
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* FAQ */}
                  <FAQSection items={faqs} />
                </>
              )}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-primary py-16 text-white text-center">
            <h2 className="mb-6 text-3xl font-bold">Ready to build with TheriaAPI?</h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl">
              Start your 14-day free trial. No credit card required.
            </p>
            <Link to="/signup">
              <Button className="bg-white px-8 py-6 text-lg text-primary hover:bg-gray-100">
                Start Free Trial
              </Button>
            </Link>
          </section>
        </main>

        <Footer />
      </div>
    </CheckoutProvider>
  );
};

export default Pricing;
