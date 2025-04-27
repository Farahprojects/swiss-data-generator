import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  PricingPlan,
  AddOnCard,
  CheckoutProvider,
} from "@/components/pricing/PaymentComponents";
import { FAQSection } from "@/components/pricing/FAQSection";
import { plans, addOns, faqs } from "@/utils/pricing";

const Pricing = () => {
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const t0 = performance.now();
    supabase.functions
      .listFunctions()
      .catch((e) => console.error("Supabase ping failed:", e))
      .finally(() => {
        setBusy(false);
        console.log(`Pricing page ready in ${(performance.now() - t0).toFixed(0)} ms`);
      });
  }, []);

  return (
    <CheckoutProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />

        {/* ── Hero ────────────────────────────────────────────── */}
        <header className="bg-accent py-20 text-center">
          <h1 className="mb-6 text-4xl font-bold">One API Key — All The Cosmos</h1>
          <p className="mx-auto max-w-3xl text-xl text-gray-700">
            Predict. Match. Innovate. Our Swiss-Ephemeris engine delivers every
            astrological calculation through a single, developer-friendly
            endpoint. Choose the usage tier that fits today and scale
            effortlessly tomorrow.
          </p>
        </header>

        {/* ── Pricing grid ────────────────────────────────────── */}
        <main className="flex-grow">
          <section className="container mx-auto -mt-10 py-20 px-4">
            {busy ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-lg">Loading pricing …</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  {plans.map((p) => (
                    <PricingPlan key={p.name} {...p} />
                  ))}
                </div>

                {/* ── Add-Ons ───────────────────────────────── */}
                <section className="mt-20 rounded-xl bg-gray-50 py-16">
                  <div className="container mx-auto px-4">
                    <h2 className="mb-4 text-center text-4xl font-bold text-primary">
                      Fine-Tune Your Insights
                    </h2>
                    <p className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600">
                      Add-ons bolt seamlessly onto the same API key. Enable them
                      during checkout — no extra endpoints, no new auth tokens.
                    </p>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      {addOns.map((a) => (
                        <AddOnCard key={a.name} {...a} />
                      ))}
                    </div>
                  </div>
                </section>

                {/* ── FAQ ───────────────────────────────────── */}
                <FAQSection items={faqs} />
              </>
            )}
          </section>
        </main>

        {/* ── CTA footer ─────────────────────────────────────── */}
        <section className="bg-primary py-16 text-center text-white">
          <h2 className="mb-6 text-3xl font-bold">
            Ready to launch cosmic features?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl">
            Start your free 14-day trial now — no credit card required.
          </p>
          <Link to="/signup">
            <Button className="bg-white px-8 py-6 text-lg text-primary hover:bg-gray-100">
              Activate Trial
            </Button>
          </Link>
        </section>

        <Footer />
      </div>
    </CheckoutProvider>
  );
};

export default Pricing;
