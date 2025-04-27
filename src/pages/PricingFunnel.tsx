
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { addOns } from "@/utils/pricing";

interface LocationState {
  selectedPlan: string;
}

const PricingFunnel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedPlan } = (location.state as LocationState) || { selectedPlan: 'starter' };
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const relevantAddOns = selectedPlan === 'Growth' 
    ? addOns.filter(addon => addon.name === "Relationship Compatibility")
    : addOns;

  const toggleAddon = (addonName: string) => {
    setSelectedAddOns(prev => 
      prev.includes(addonName) 
        ? prev.filter(name => name !== addonName)
        : [...prev, addonName]
    );
  };

  const handleProceedToCheckout = () => {
    // Pass selected add-ons to checkout
    navigate("/checkout", { 
      state: { 
        plan: selectedPlan,
        addOns: selectedAddOns
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h1 className="mb-8 text-center text-4xl font-bold">
              {selectedPlan === 'Growth' 
                ? "Enhance Your Growth Plan"
                : "Supercharge Your Astrology Platform"}
            </h1>
            <p className="mb-12 text-center text-xl text-gray-600">
              {selectedPlan === 'Growth'
                ? "Take your platform to the next level with relationship analysis"
                : "Choose from these powerful add-ons to expand your capabilities"}
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {relevantAddOns.map((addon, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer p-6 transition-all hover:shadow-lg ${
                    selectedAddOns.includes(addon.name)
                      ? "border-2 border-primary"
                      : ""
                  }`}
                  onClick={() => toggleAddon(addon.name)}
                >
                  <h3 className="mb-4 text-2xl font-bold text-primary">
                    {addon.name}
                  </h3>
                  <p className="mb-4 text-gray-600">{addon.description}</p>
                  <p className="mb-4 text-2xl font-semibold text-primary">
                    {addon.price}
                  </p>
                  <div className="space-y-2">
                    {addon.details.map((detail, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm text-gray-600">{detail}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button 
                onClick={handleProceedToCheckout}
                className="px-8 py-6 text-lg"
              >
                {selectedAddOns.length > 0 
                  ? `Proceed with ${selectedAddOns.length} add-on${selectedAddOns.length > 1 ? 's' : ''}`
                  : "Continue without add-ons"}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PricingFunnel;
