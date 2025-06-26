
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { handleServicePurchase, hasValidPrice } from "@/utils/servicePurchase";
import { getValidImageUrl, hasValidImage } from "@/utils/imageValidation";
import { Clock, Users, Target, TrendingUp, Shield, Calendar, ArrowRight, Star } from "lucide-react";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

export const ProfessionalTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [purchasingService, setPurchasingService] = useState<number | null>(null);
  
  const themeColor = customizationData.themeColor || '#007AFF';
  const fontFamily = customizationData.fontFamily || 'Inter';

  const sectionPadding = isPreview ? 'py-12' : 'py-16 sm:py-20 lg:py-24';

  // Check if header image exists and is valid
  const headerImageUrl = getValidImageUrl(customizationData.headerImageData || customizationData.headerImageUrl);
  const aboutImageUrl = getValidImageUrl(customizationData.aboutImageData || customizationData.aboutImageUrl);

  // Create report service card - ALWAYS show it
  const reportService = {
    title: "Personal Insights Report",
    description: "Comprehensive analysis designed for your unique journey and goals.",
    price: "$29",
    isReportService: true
  };

  // Add report service as first item
  const allServices = [reportService, ...(customizationData.services || [])];

  const handlePurchaseClick = async (service: any, index: number) => {
    if (isPreview) {
      toast({
        title: "Preview Mode",
        description: "Purchase functionality is disabled in preview mode.",
        variant: "default"
      });
      return;
    }

    // Handle report service differently
    if (service.isReportService) {
      window.location.href = `/${slug}/vibe`;
      return;
    }

    setPurchasingService(index);

    await handleServicePurchase({
      title: service.title,
      description: service.description,
      price: service.price,
      coachSlug: slug || 'unknown',
      coachName: customizationData.coachName || 'Coach'
    }, (error) => {
      toast({
        title: "Purchase Failed",
        description: error,
        variant: "destructive"
      });
    });

    setPurchasingService(null);
  };

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: `${fontFamily}, -apple-system, BlinkMacSystemFont, sans-serif` }}>
      {/* Simplified Hero Section - Apple Style */}
      <section className={`${sectionPadding} relative overflow-hidden`}>
        {headerImageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-5"
            style={{ backgroundImage: `url(${headerImageUrl})` }}
          />
        )}
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 mb-8 leading-none tracking-tight">
              Discover your
              <br />
              <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
                true potential.
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 font-light leading-relaxed max-w-3xl mx-auto">
              {customizationData.tagline || "Personalized insights that illuminate your unique path forward"}
            </p>
            
            <Button 
              className="h-12 px-8 text-base font-medium rounded-full transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: themeColor, color: 'white' }}
            >
              {customizationData.buttonText || "Get Your Insights"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Clean About Section - Apple Inspired */}
      <section id="about" className={`${sectionPadding} bg-white`}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid gap-20 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              {aboutImageUrl ? (
                <div className="relative">
                  <img
                    src={aboutImageUrl}
                    alt="About"
                    className="w-full h-96 object-cover rounded-2xl"
                  />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl h-96 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200"></div>
                    <div className="font-light text-sm">Your Photo</div>
                  </div>
                </div>
              )}
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl sm:text-5xl font-light mb-8 text-gray-900 tracking-tight leading-tight">
                {customizationData.introTitle || "Designed for you."}
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-12 font-light">
                {customizationData.bio || "Every insight is crafted with precision, tailored to your unique story and timing. No generic advice—just clarity designed specifically for your journey."}
              </p>
              <div className="space-y-8">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-lg">Precision Matters</h4>
                  <p className="text-gray-600 font-light leading-relaxed">Every detail creates a more accurate and meaningful reading.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-lg">Practical Guidance</h4>
                  <p className="text-gray-600 font-light leading-relaxed">Insights you can actually use in your daily life and important decisions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Services Section - Apple Card Grid */}
      <section id="services" className={`${sectionPadding} bg-gray-50`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-semibold mb-6 text-gray-900 tracking-tight">
              Simple. Clear. Transformative.
            </h2>
            <p className="text-xl text-gray-600 font-light">Choose your path forward</p>
          </div>
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {allServices.map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 hover:shadow-lg transition-all duration-300 border border-gray-100 relative overflow-hidden group"
              >
                {service.isReportService && (
                  <div className="absolute top-6 right-6">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  </div>
                )}
                
                <h3 className="text-2xl font-semibold mb-4 text-gray-900">{service.title}</h3>
                <p className="text-gray-600 mb-8 leading-relaxed font-light">{service.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-semibold text-gray-900">{service.price}</div>
                  {service.isReportService ? (
                    <Button 
                      onClick={() => handlePurchaseClick(service, index)}
                      className="h-12 px-6 rounded-full font-medium transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: themeColor, color: 'white' }}
                    >
                      Get Started
                    </Button>
                  ) : hasValidPrice(service.price) ? (
                    <Button 
                      onClick={() => handlePurchaseClick(service, index)}
                      disabled={purchasingService === index}
                      className="h-12 px-6 rounded-full font-medium transition-all duration-200 hover:scale-105"
                      style={{ backgroundColor: themeColor, color: 'white' }}
                    >
                      {purchasingService === index ? "Processing..." : "Purchase"}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="h-12 px-6 rounded-full font-medium border-gray-300 hover:border-gray-400 transition-colors"
                    >
                      Learn More
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimal CTA Section */}
      <section className={`${sectionPadding} bg-white`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-semibold mb-6 text-gray-900 tracking-tight">
            {customizationData.footerHeading || "Ready to begin?"}
          </h2>
          <p className="text-xl text-gray-600 mb-12 font-light leading-relaxed">
            {customizationData.footerSubheading || "Your personalized insights are just a few clicks away."}
          </p>
          <Button 
            className="h-14 px-10 text-lg font-medium rounded-full transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: themeColor, color: 'white' }}
          >
            {customizationData.buttonText || "Get Your Insights"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <div className="text-2xl font-semibold mb-4 text-gray-900 tracking-tight">
              {customizationData.coachName || "Your Name"}
            </div>
            <p className="text-gray-600 mb-8 font-light">Personalized insights for your unique journey</p>
            <div className="flex justify-center space-x-8 text-sm text-gray-500 font-medium">
              <span className="hover:text-gray-700 cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-gray-700 cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-gray-700 cursor-pointer transition-colors">Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
