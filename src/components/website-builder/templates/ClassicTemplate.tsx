
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { handleServicePurchase, hasValidPrice } from "@/utils/servicePurchase";
import { getValidImageUrl, hasValidImage } from "@/utils/imageValidation";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

// Helper function to validate and filter services
const validateServices = (services: any[]) => {
  if (!Array.isArray(services)) {
    return [];
  }
  
  return services
    .filter((service: any) => service && typeof service === 'object' && service !== null)
    .filter((service: any) => service.title || service.description || service.price);
};

export const ClassicTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [purchasingService, setPurchasingService] = useState<number | null>(null);
  
  const themeColor = customizationData.themeColor || '#8B5CF6';
  const fontFamily = customizationData.fontFamily || 'Playfair Display';

  const sectionPadding = isPreview ? 'py-6' : 'py-12 sm:py-16 lg:py-20';
  const heroPadding = isPreview ? 'py-8' : 'py-16 sm:py-24 lg:py-32';

  // Check if header image exists and is valid
  const headerImageUrl = getValidImageUrl(customizationData.headerImageData || customizationData.headerImageUrl);
  const aboutImageUrl = getValidImageUrl(customizationData.aboutImageData || customizationData.aboutImageUrl);

  // Create report service card with customizable data
  const reportService = {
    title: customizationData.reportService?.title || "Personal Insights Report",
    description: customizationData.reportService?.description || "Get a comprehensive analysis of your personality, strengths, and growth opportunities with our detailed assessment.",
    price: customizationData.reportService?.price || "$29",
    isReportService: true
  };

  // Filter out null services and ensure we have valid service objects
  const validServices = validateServices(customizationData.services || []);
  
  // Add report service as first item always (including preview)
  const allServices = [reportService, ...validServices];

  // Helper function to get button styling - moved inside component to access variables
  const getButtonStyles = (isInverted = false) => {
    const buttonColor = customizationData.buttonColor || themeColor;
    const buttonTextColor = customizationData.buttonTextColor || '#FFFFFF';
    const buttonFontFamily = customizationData.buttonFontFamily || fontFamily;
    const buttonStyle = customizationData.buttonStyle || 'bordered';
    
    const baseStyles = {
      fontFamily: `${buttonFontFamily}, serif`,
      backgroundColor: isInverted ? 'transparent' : (buttonStyle === 'bordered' ? 'transparent' : buttonColor),
      color: buttonTextColor,
      border: buttonStyle === 'borderless' ? 'none' : `2px solid ${buttonColor}`,
    };

    return baseStyles;
  };

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
    <div className="bg-cream-50" style={{ fontFamily: `${fontFamily}, serif` }}>
      {/* Classic Centered Hero */}
      <section className={`relative ${heroPadding} ${!headerImageUrl ? 'bg-gradient-to-b from-amber-50 to-white' : ''}`}>
        {/* Header background image with no opacity reduction */}
        {headerImageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${headerImageUrl})` }}
          ></div>
        )}
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{ textShadow: headerImageUrl ? '2px 2px 4px rgba(0,0,0,0.7)' : 'none' }}
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto mb-6 sm:mb-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500"></div>
            <h1 className={`text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-serif font-bold mb-4 sm:mb-6 leading-tight ${headerImageUrl ? 'text-white' : 'text-gray-900'}`}>
              {customizationData.coachName || "Dr. Sarah Wilson"}
            </h1>
            <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-4 sm:mb-6"></div>
            <p className={`text-lg sm:text-xl lg:text-2xl mb-8 sm:mb-10 italic leading-relaxed ${headerImageUrl ? 'text-gray-200' : 'text-gray-700'}`}>
              {customizationData.tagline || "Classical Wisdom for Modern Challenges"}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="py-3 px-6 sm:py-4 sm:px-10 text-base sm:text-lg min-h-[44px] hover:opacity-90 transition-opacity"
                style={getButtonStyles()}
              >
                {customizationData.buttonText || "Begin Your Journey"}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className={`${sectionPadding} bg-white`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12 items-center">
            <div className="lg:col-span-1 order-2 lg:order-1">
              {aboutImageUrl ? (
                <img
                  src={aboutImageUrl}
                  alt="Philosophy"
                  className="w-full h-32 sm:h-48 lg:h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-32 sm:h-48 lg:h-64 bg-gradient-to-br from-purple-200 to-pink-200 rounded-lg"></div>
              )}
            </div>
            <div className="lg:col-span-2 order-1 lg:order-2 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold mb-4 sm:mb-6 text-gray-900">
                {customizationData.introTitle || "My Philosophy"}
              </h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                {customizationData.bio || "Drawing from time-tested principles and classical approaches, I believe in the power of deep reflection, meaningful dialogue, and gradual transformation."}
              </p>
              <div className="flex items-center justify-center lg:justify-start text-amber-600">
                <div className="w-6 sm:w-8 h-0.5 bg-amber-600 mr-3 sm:mr-4"></div>
                <span className="italic text-sm sm:text-base">Wisdom through experience</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services with Classic Layout */}
      <section className={`${sectionPadding} bg-amber-50`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold mb-3 sm:mb-4 text-gray-900">
              {customizationData.reportService?.sectionHeading || "Services Offered"}
            </h2>
            <div className="w-16 sm:w-24 h-1 bg-amber-500 mx-auto"></div>
          </div>
          
          {allServices.length > 0 ? (
            <div className="space-y-8 sm:space-y-12">
              {allServices.map((service: any, index: number) => {
                const serviceImageUrl = getValidImageUrl(service.imageData || service.imageUrl);
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.2 }}
                    className={`grid gap-6 lg:gap-8 lg:grid-cols-2 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
                  >
                    <div className={index % 2 === 1 ? 'lg:order-2' : 'order-2 lg:order-1'}>
                      {serviceImageUrl ? (
                        <img
                          src={serviceImageUrl}
                          alt={service.title || 'Service'}
                          className="w-full h-24 sm:h-32 lg:h-48 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-24 sm:h-32 lg:h-48 bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg"></div>
                      )}
                    </div>
                    <div className={`text-center lg:text-left ${index % 2 === 1 ? 'lg:order-1' : 'order-1 lg:order-2'}`}>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-serif font-semibold mb-3 sm:mb-4 text-gray-900 break-words">
                        {service.title || 'Service'}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 leading-relaxed break-words">
                        {service.description || 'Professional service description'}
                      </p>
                      <div className="flex items-center justify-center lg:justify-between flex-wrap gap-4">
                        <span className="text-lg sm:text-xl font-semibold" style={{ color: themeColor }}>
                          {service.price || 'Contact for pricing'}
                        </span>
                        {service.isReportService ? (
                          <Button 
                            onClick={() => handlePurchaseClick(service, index)}
                            className="min-h-[44px] hover:opacity-90 transition-opacity"
                            style={getButtonStyles()}
                          >
                            Get Report
                          </Button>
                        ) : hasValidPrice(service.price) ? (
                          <Button 
                            onClick={() => handlePurchaseClick(service, index)}
                            disabled={purchasingService === index}
                            className="min-h-[44px] hover:opacity-90 transition-opacity"
                            style={getButtonStyles()}
                          >
                            {purchasingService === index ? "Processing..." : "Purchase"}
                          </Button>
                        ) : (
                          <Button 
                            className="min-h-[44px] hover:opacity-90 transition-opacity"
                            style={getButtonStyles(true)}
                          >
                            Learn More
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500">No services configured yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Elegant CTA */}
      <section className={`${sectionPadding} bg-gray-900 text-white`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold mb-4 sm:mb-6">
            {customizationData.footerHeading || "Begin Your Transformation"}
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90 italic">
            {customizationData.footerSubheading || "Every journey begins with a single step"}
          </p>
          <div className="w-16 sm:w-24 h-1 bg-amber-500 mx-auto mb-6 sm:mb-8"></div>
          <Button 
            className="py-3 px-6 sm:py-4 sm:px-10 text-base sm:text-lg min-h-[44px] hover:opacity-90 transition-opacity"
            style={(() => {
              const buttonColor = customizationData.buttonColor || themeColor;
              const buttonTextColor = customizationData.buttonTextColor || '#FFFFFF';
              const buttonStyle = customizationData.buttonStyle || 'bordered';
              return {
                ...getButtonStyles(), 
                backgroundColor: buttonStyle === 'bordered' ? '#FFFFFF' : buttonColor, 
                color: buttonTextColor
              };
            })()}
          >
            {customizationData.buttonText || "Schedule Consultation"}
          </Button>
        </div>
      </section>
    </div>
  );
};
