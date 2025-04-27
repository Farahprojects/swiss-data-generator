
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PricingPlan, AddOnCard } from "@/components/pricing/PaymentComponents";
import { FAQSection } from "@/components/pricing/FAQSection";
import { plans, addOns, faqs } from "@/utils/pricing";

const Pricing: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // Check backend connectivity once on mount
  useEffect(() => {
    const start = performance.now();
    (async () => {
      try {
        // Replaced listFunctions with a simple health check
        await supabase.from('user_info').select('count').limit(1);
        console.log("Supabase connection ready");
      } catch (err) {
        console.error("Supabase connection error", err);
        toast({
          title: "Network Error",
          description: "Could not reach our billing service. Some actions may fail.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        console.log(`Pricing page ready in ${(performance.now() - start).toFixed(0)}ms`);
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-accent py-20 text-center">
          <div className="container mx-auto px-4">
            <h1 className="mb-6 text-4xl font-bold">Simple, Transparent Pricing</h1>
            <p className="mx-auto max-w-3xl text-xl text-gray-700">
              All plans unlock every endpoint—just pick the quota that fits.
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="-mt-10 py-20">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-lg">Loading pricing…</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  {plans.map((p, i) => (
                    <PricingPlan key={i} {...p} />
                  ))}
                </div>

                {/* Add‑ons – always visible; status flag indicates included vs upsell */}
                <section className="mt-16 bg-gray-50 py-16">
                  <div className="container mx-auto px-4">
                    <div className="mx-auto mb-12 max-w-3xl text-center">
                      <h2 className="mb-4 text-4xl font-bold text-primary">Enhance Your Build</h2>
                      <p className="text-lg text-gray-600">
                        Western or Vedic—your choice in every endpoint. Scale with optional extras when you're ready.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      {addOns.map((a, i) => (
                        <AddOnCard 
                          key={i} 
                          name={a.name}
                          price={a.price}
                          description={a.description}
                          details={a.details}
                          status={a.status === "included" ? "included" : "upgrade"}
                        />
                      ))}
                    </div>
                  </div>
                </section>

                {/* Feature comparison placeholder – keep existing table component */}
                <section className="bg-gray-50 py-16">
                  <div className="container mx-auto px-4">
                    <h2 className="mb-12 text-center text-3xl font-bold">Feature Comparison</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full overflow-hidden rounded-lg bg-white shadow-sm">
                        {/* … existing rows/columns … */}
                      </table>
                    </div>
                  </div>
                </section>

                <FAQSection items={faqs} />
              </>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary py-16 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-6 text-3xl font-bold">Ready to build with TheriaAPI?</h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl">Start your 7‑day full‑access trial. No credit‑card required.</p>
            <Link to="/signup">
              <Button className="bg-white px-8 py-6 text-lg text-primary hover:bg-gray-100">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
