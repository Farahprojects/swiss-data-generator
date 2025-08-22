import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Check, PackageCheck, Shield, Star, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { plans, addOns, getPriceId } from "@/utils/pricing";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Plan = "Starter" | "Growth" | "Professional";
type AddOn = "Relationship Compatibility" | "Yearly Cycle" | "Transits";

interface SelectedAddOns {
  [key: string]: boolean;
}

const UpgradePlan = () => {
  const { user } = useAuth();
  const { toast, message, clearToast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("Starter");
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOns>({});
  const [isLoading, setIsLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [currentUserPlan, setCurrentUserPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const mockUserPlan: Plan = "Starter";
    setCurrentUserPlan(mockUserPlan);
    setSelectedPlan(mockUserPlan);
  }, [user]);

  useEffect(() => {
    let price = 0;

    switch (selectedPlan) {
      case "Starter":
        price += 19;
        break;
      case "Growth":
        price += 49;
        break;
      case "Professional":
        price += 99;
        break;
      default:
        price += 19;
    }

    if (selectedPlan !== "Professional") {
      if (selectedAddOns["Relationship Compatibility"] && selectedPlan === "Starter") {
        price += 15;
      }
      if (selectedAddOns["Yearly Cycle"] && selectedPlan === "Starter") {
        price += 15;
      }
      if (selectedAddOns["Transits"] && selectedPlan === "Starter") {
        price += 19;
      }
      if (selectedAddOns["Relationship Compatibility"] && selectedPlan === "Growth") {
        price += 15;
      }
    }

    setTotalPrice(price);
  }, [selectedPlan, selectedAddOns]);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    
    if (plan === "Professional") {
      setSelectedAddOns({});
    } else if (plan === "Growth") {
      setSelectedAddOns({
        "Relationship Compatibility": false,
      });
    } else {
      setSelectedAddOns({
        "Relationship Compatibility": false,
        "Yearly Cycle": false,
        "Transits": false,
      });
    }
  };

  const handleAddOnChange = (addOn: AddOn) => {
    setSelectedAddOns(prev => ({
      ...prev,
      [addOn]: !prev[addOn],
    }));
  };

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to upgrade your plan",
          variant: "destructive"
        });
        return;
      }
      
      const selectedAddOnsList = Object.entries(selectedAddOns)
        .filter(([_, isSelected]) => isSelected)
        .map(([name]) => name);
      
      const planPriceId = await getPriceId(selectedPlan);
      
      const addOnPriceIds = await Promise.all(selectedAddOnsList.map(addOn => getPriceId(addOn)));
      
      const allPriceIds = ([planPriceId, ...addOnPriceIds].filter(Boolean) as string[]);
      
      if (!allPriceIds.length) {
        toast({
          title: "Error",
          description: "Could not find price for selected plan",
          variant: "destructive"
        });
        return;
      }
      
      // Temporarily support single-item checkout only
      if (allPriceIds.length > 1) {
        toast({
          title: "Checkout not available",
          description: "Multiple items checkout isn't supported yet. Please select a single plan without add-ons.",
          variant: "destructive"
        });
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          mode: 'payment',
          priceId: allPriceIds[0] as string,
        }
      });
      
      if (error) {
        console.error('Error creating checkout session:', error);
        toast({
          title: "Checkout Failed",
          description: error.message || "Could not initiate checkout process",
          variant: "destructive"
        });
        return;
      }
      
      if (data?.url) {
        setShowSuccessDialog(true);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Failed to upgrade plan:", err);
      toast({
        title: "Upgrade Error",
        description: "There was a problem upgrading your plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanIcon = (plan: Plan) => {
    switch (plan) {
      case "Starter":
        return <PackageCheck className="h-6 w-6 text-primary" />;
      case "Growth":
        return <Star className="h-6 w-6 text-primary" />;
      case "Professional":
        return <Shield className="h-6 w-6 text-primary" />;
      default:
        return <PackageCheck className="h-6 w-6 text-primary" />;
    }
  };

  const getPlanFeatures = (plan: Plan) => {
    switch (plan) {
      case "Starter":
        return [
          "Choose Western OR Vedic Natal Charts",
          "50,000 API calls/month",
          "1 API key",
        ];
      case "Growth":
        return [
          "Western + Vedic Natal Charts",
          "12 month Transit forecast",
          "Yearly Cycle",
          "200,000 API calls/month",
          "2 API keys",
          "Sidereal toggle unlocked",
        ];
      case "Professional":
        return [
          "Everything in Growth, plus:",
          "Relationship Compatibility",
          "Return Charts (Solar, Lunar, Saturn, Jupiter)",
          "750,000 API calls/month",
          "Full access API",
          "Slack/email support priority",
        ];
      default:
        return [];
    }
  };

  // Helper function to render the inline toast message
  const renderToastMessage = () => {
    if (!message) return null;
    
    return (
      <Alert className={`mb-6 ${
        message.variant === "destructive" 
          ? "bg-red-50 border-red-200 text-red-800" 
          : message.variant === "success"
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-blue-50 border-blue-200 text-blue-800"
      }`}>
        <AlertCircle className={`h-4 w-4 ${
          message.variant === "destructive" 
            ? "text-red-600" 
            : message.variant === "success"
            ? "text-green-600"
            : "text-blue-600"
        }`} />
        <AlertDescription>
          {message.title && <p className="font-medium">{message.title}</p>}
          {message.description && <p>{message.description}</p>}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      <UnifiedNavigation />
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">Upgrade Your Plan</h1>
          
          {/* Display inline toast message if present */}
          {message && renderToastMessage()}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={`transition-all hover:shadow-md ${selectedPlan === "Starter" ? "ring-2 ring-primary" : "border border-gray-200"}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      {getPlanIcon("Starter")}
                      {currentUserPlan === "Starter" && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900 mt-2">Starter</CardTitle>
                    <CardDescription className="text-gray-600">
                      Simple, very clean, enough for solo devs or small apps
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">$19<span className="text-base font-normal text-gray-500">/month</span></p>
                    <ul className="mt-4 space-y-2">
                      {getPlanFeatures("Starter").map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleSelectPlan("Starter")}
                      variant={selectedPlan === "Starter" ? "default" : "outline"}
                      className="w-full"
                    >
                      {selectedPlan === "Starter" ? "Selected" : "Select Plan"}
                    </Button>
                  </CardFooter>
                </Card>

                <Card className={`transition-all hover:shadow-md ${selectedPlan === "Growth" ? "ring-2 ring-primary" : "border border-gray-200"}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      {getPlanIcon("Growth")}
                      {currentUserPlan === "Growth" && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900 mt-2">Growth</CardTitle>
                    <CardDescription className="text-gray-600">
                      For apps that need serious astrology features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">$49<span className="text-base font-normal text-gray-500">/month</span></p>
                    <ul className="mt-4 space-y-2">
                      {getPlanFeatures("Growth").map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleSelectPlan("Growth")}
                      variant={selectedPlan === "Growth" ? "default" : "outline"}
                      className="w-full"
                    >
                      {selectedPlan === "Growth" ? "Selected" : "Select Plan"}
                    </Button>
                  </CardFooter>
                </Card>

                <Card className={`transition-all hover:shadow-md ${selectedPlan === "Professional" ? "ring-2 ring-primary" : "border border-gray-200"}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      {getPlanIcon("Professional")}
                      {currentUserPlan === "Professional" && (
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium">
                          Current Plan
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900 mt-2">Professional</CardTitle>
                    <CardDescription className="text-gray-600">
                      Ideal for commercial apps or multi-feature platforms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">$99<span className="text-base font-normal text-gray-500">/month</span></p>
                    <ul className="mt-4 space-y-2">
                      {getPlanFeatures("Professional").map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={() => handleSelectPlan("Professional")}
                      variant={selectedPlan === "Professional" ? "default" : "outline"}
                      className="w-full"
                    >
                      {selectedPlan === "Professional" ? "Selected" : "Select Plan"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {selectedPlan !== "Professional" && (
                <Card className="border border-gray-200 transition-all hover:shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">Available Add-ons</CardTitle>
                    <CardDescription>
                      {selectedPlan === "Starter" ? 
                        "Customize your plan with these powerful add-ons" : 
                        "Growth plan already includes Yearly Cycle and Transits"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3 p-3 rounded-md hover:bg-gray-50 transition-colors">
                        <Checkbox 
                          id="relationship"
                          checked={!!selectedAddOns["Relationship Compatibility"]}
                          onCheckedChange={() => handleAddOnChange("Relationship Compatibility")}
                        />
                        <div className="space-y-1">
                          <label htmlFor="relationship" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                            Relationship Compatibility
                            <span className="ml-2 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              +$15/mo
                            </span>
                          </label>
                          <p className="text-sm text-gray-500">Deep dive into relationship dynamics and compatibility analysis</p>
                        </div>
                      </div>
                      
                      {selectedPlan === "Starter" && (
                        <div className="flex items-start space-x-3 p-3 rounded-md hover:bg-gray-50 transition-colors">
                          <Checkbox 
                            id="yearly"
                            checked={!!selectedAddOns["Yearly Cycle"]}
                            onCheckedChange={() => handleAddOnChange("Yearly Cycle")}
                          />
                          <div className="space-y-1">
                            <label htmlFor="yearly" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                              Yearly Cycle Analysis
                              <span className="ml-2 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                +$15/mo
                              </span>
                            </label>
                            <p className="text-sm text-gray-500">Solar, Lunar, Saturn, and Jupiter return calculations</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedPlan === "Starter" && (
                        <div className="flex items-start space-x-3 p-3 rounded-md hover:bg-gray-50 transition-colors">
                          <Checkbox 
                            id="transits"
                            checked={!!selectedAddOns["Transits"]}
                            onCheckedChange={() => handleAddOnChange("Transits")}
                          />
                          <div className="space-y-1">
                            <label htmlFor="transits" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                              12-Month Transit Report
                              <span className="ml-2 text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                +$19/mo
                              </span>
                            </label>
                            <p className="text-sm text-gray-500">Comprehensive transit predictions for future planning</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-start gap-3">
                          <div>
                            <h4 className="text-base font-semibold text-gray-800">AI-powered Reports</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Get detailed astrological interpretations with AI-powered reports for just $2 per report.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-3 border-primary/30 hover:bg-primary/10"
                              onClick={() => window.location.href = "/settings"}
                            >
                              Top Up AI Balance
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <Card className="border border-gray-200 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">Summary</CardTitle>
                    <CardDescription>Your selected subscription</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Selected Plan</h4>
                      <p className="text-lg font-semibold flex items-center gap-2">
                        {getPlanIcon(selectedPlan)}
                        {selectedPlan}
                      </p>
                    </div>
                    
                    {Object.entries(selectedAddOns).some(([_, isSelected]) => isSelected) && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Selected Add-ons</h4>
                        <ul className="mt-1 space-y-1">
                          {Object.entries(selectedAddOns).map(([name, isSelected]) => (
                            isSelected && (
                              <li key={name} className="text-sm flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                {name}
                              </li>
                            )
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total</span>
                      <span className="text-2xl font-bold text-primary">${totalPrice}/mo</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <Button 
                      className="w-full py-6 text-lg font-medium transition-all"
                      onClick={handleUpgrade}
                      disabled={isLoading || (currentUserPlan === selectedPlan && !Object.values(selectedAddOns).some(Boolean))}
                    >
                      {isLoading ? "Processing..." : "Upgrade Now"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">Congratulations!</DialogTitle>
            <DialogDescription className="text-center">
              Your plan has been successfully upgraded to {selectedPlan}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full" 
              onClick={() => {
                setShowSuccessDialog(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UpgradePlan;
