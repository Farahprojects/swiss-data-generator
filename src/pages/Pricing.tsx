import React from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Pricing = () => {
  const { user } = useAuth();

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Please log in to subscribe");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) {
        console.error('Checkout error:', error);
        toast.error('Failed to create checkout session');
        return;
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-light text-gray-900 mb-4 text-center tracking-tight">
              Simple Monthly Subscription
            </h1>
            <p className="max-w-2xl mx-auto text-center text-lg text-gray-700 mb-10 font-light">
              Get unlimited access to all our features with our affordable monthly plan.
            </p>
          </div>
        </section>

        {/* PRICING CARD */}
        <section className="container mx-auto pb-16 px-4">
          <div className="flex justify-center">
            <Card className="w-full max-w-md relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                <Star className="w-4 h-4 mr-1" />
                Most Popular
              </Badge>
              
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-2xl font-light">Monthly Plan</CardTitle>
                <CardDescription>Everything you need to get started</CardDescription>
                <div className="mt-4">
                  <span className="text-5xl font-light text-primary">$10</span>
                  <span className="text-xl text-gray-500 font-light">/month</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="font-light">Full platform access</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="font-light">All premium features</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="font-light">Priority support</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="font-light">Cancel anytime</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleSubscribe}
                  className="w-full bg-primary text-primary-foreground font-light rounded-xl px-8 py-4 text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  disabled={!user}
                >
                  {user ? "Subscribe Now" : "Login to Subscribe"}
                </Button>
                
                {!user && (
                  <p className="text-sm text-gray-500 text-center font-light">
                    Please log in to start your subscription
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
