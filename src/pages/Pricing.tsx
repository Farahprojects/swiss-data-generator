import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PricingPlan, AddOnCard } from "@/components/pricing/PaymentComponents";
import { FAQSection } from "@/components/pricing/FAQSection";
import { plans, addOns, faqs } from "@/utils/pricing";

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const startTime = performance.now();
    console.log("Pricing page mounting");
    
    const checkEdgeFunctionReady = async () => {
      try {
        await supabase.functions.listFunctions();
        console.log("Supabase connection ready");
      } catch (error) {
        console.error("Supabase connection error:", error);
      } finally {
        setIsLoading(false);
        const endTime = performance.now();
        console.log(`Pricing page ready in ${(endTime - startTime).toFixed(2)}ms`);
      }
    };
    
    checkEdgeFunctionReady();
    
    return () => {
      console.log("Pricing page unmounting");
    };
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        <section className="bg-accent py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-6">Simple, Transparent Pricing</h1>
              <p className="text-xl text-gray-700 mb-8">
                Choose the plan that best fits your needs. All plans include access to our 
                Swiss Ephemeris-powered API and comprehensive documentation.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 -mt-10">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-lg">Loading pricing information...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {plans.map((plan, index) => (
                    <PricingPlan
                      key={index}
                      {...plan}
                    />
                  ))}
                </div>

                <section className="mt-16 bg-gray-50 py-16">
                  <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-12">
                      <h2 className="text-4xl font-bold mb-4 text-primary">
                        Enhance Your API with Powerful Add-Ons
                      </h2>
                      <p className="text-lg text-gray-600">
                        All add-ons include full support for both Western (Tropical) and Vedic (Sidereal) calculations. 
                        Simply choose your preferred system in your API requests — no extra fees, no limitations.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {addOns.map((addon, index) => (
                        <AddOnCard
                          key={index}
                          name={addon.name}
                          price={addon.price}
                          description={addon.description}
                          details={addon.details}
                          dropdownItems={addon.details.split('. ')}
                        />
                      ))}
                    </div>
                  </div>
                </section>

                <section className="py-16 bg-gray-50">
                  <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-12 text-center">Feature Comparison</h2>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full bg-white shadow-sm rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left p-4 font-medium text-gray-600">Feature</th>
                            <th className="p-4 font-medium text-gray-600">Starter</th>
                            <th className="p-4 font-medium text-gray-600 bg-primary/5">Growth</th>
                            <th className="p-4 font-medium text-gray-600">Professional</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-gray-200">
                            <td className="p-4 text-gray-700">API Calls/month</td>
                            <td className="p-4 text-center">50,000</td>
                            <td className="p-4 text-center bg-primary/5">200,000</td>
                            <td className="p-4 text-center">750,000</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="p-4 text-gray-700">Western and Vedic Natal Charts</td>
                            <td className="p-4 text-center">✓</td>
                            <td className="p-4 text-center bg-primary/5">✓</td>
                            <td className="p-4 text-center">✓</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="p-4 text-gray-700">Transit Forecast (12 months)</td>
                            <td className="p-4 text-center">—</td>
                            <td className="p-4 text-center bg-primary/5">✓</td>
                            <td className="p-4 text-center">✓</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="p-4 text-gray-700">Yearly Cycle</td>
                            <td className="p-4 text-center">—</td>
                            <td className="p-4 text-center bg-primary/5">✓</td>
                            <td className="p-4 text-center">✓</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="p-4 text-gray-700">API Keys</td>
                            <td className="p-4 text-center">1</td>
                            <td className="p-4 text-center bg-primary/5">2</td>
                            <td className="p-4 text-center">5</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="p-4 text-gray-700">Relationship Compatibility</td>
                            <td className="p-4 text-center">—</td>
                            <td className="p-4 text-center bg-primary/5">—</td>
                            <td className="p-4 text-center">✓</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="p-4 text-gray-700">Return Charts</td>
                            <td className="p-4 text-center">—</td>
                            <td className="p-4 text-center bg-primary/5">—</td>
                            <td className="p-4 text-center">✓</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="p-4 text-gray-700">Sidereal Toggle</td>
                            <td className="p-4 text-center">—</td>
                            <td className="p-4 text-center bg-primary/5">✓</td>
                            <td className="p-4 text-center">✓</td>
                          </tr>
                          <tr className="border-t border-gray-200">
                            <td className="p-4 text-gray-700">Support</td>
                            <td className="p-4 text-center">Community</td>
                            <td className="p-4 text-center bg-primary/5">Email</td>
                            <td className="p-4 text-center">Priority</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                <FAQSection items={faqs} />
              </>
            )}
          </div>
        </section>

        <section className="py-16 bg-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to build with Theraiapi?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Start your 14-day free trial today. No credit card required.
            </p>
            <Link to="/signup">
              <Button className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6">
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
