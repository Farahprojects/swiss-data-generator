
import React from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check } from "lucide-react";
import { plans, addOns, faqs } from "@/utils/pricing";

const PricingPlanCard = ({
  name,
  price,
  description,
  features,
  highlight = false,
  icon,
}: {
  name: React.ReactNode;
  price: string;
  description: string;
  features: string[];
  highlight?: boolean;
  icon?: React.ReactNode;
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
        >
          Start Free Trial
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
            <Button variant="outline">Contact Us</Button>
          </div>
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
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
              <PricingPlanCard key={p.name.toString()} {...p} />
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
        >
          Start Free Trial
        </Button>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
