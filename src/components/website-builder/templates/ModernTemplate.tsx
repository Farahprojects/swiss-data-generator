
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { handleServicePurchase, hasValidPrice } from "@/utils/servicePurchase";

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

export const ModernTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [purchasingService, setPurchasingService] = useState<number | null>(null);
  
  const themeColor = customizationData.themeColor || '#6366F1';
  const fontFamily = customizationData.fontFamily || 'Inter';

  // Helper function to get button styles
  const getButtonStyles = () => {
    const buttonColor = customizationData.buttonColor || themeColor;
    const buttonTextColor = customizationData.buttonTextColor || '#FFFFFF';
    const buttonFontFamily = customizationData.buttonFontFamily || fontFamily;
    const buttonStyle = customizationData.buttonStyle || 'bordered';
    
    return {
      backgroundColor: buttonColor,
      color: buttonTextColor,
      fontFamily: `${buttonFontFamily}, sans-serif`,
      border: buttonStyle === 'borderless' ? 'none' : `2px solid ${buttonColor}`,
      borderRadius: buttonStyle === 'borderless' ? '0' : undefined
    };
  };

  // Only adjust section height for preview, use responsive padding
  const sectionPadding = isPreview ? 'py-6' : 'py-8 sm:py-12 lg:py-16';
  const heroSection = isPreview ? 'py-8' : 'min-h-screen';

  // Check if header image exists
  const hasHeaderImage = customizationData.headerImageData?.url || customizationData.headerImageUrl;
  const headerOpacity = customizationData.headerImageOpacity || 100;

  // Filter out null services and ensure we have valid service objects
  const validServices = validateServices(customizationData.services || []);

  const handlePurchaseClick = async (service: any, index: number) => {
    if (isPreview) {
      toast({
        title: "Preview Mode",
        description: "Purchase functionality is disabled in preview mode.",
        variant: "default"
      });
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

  // Get hero styling
  const getHeroFontClass = (style: string) => {
    switch (style) {
      case 'elegant': return 'font-serif font-light';
      case 'bold': return 'font-bold';
      case 'handwritten': return 'font-mono';
      case 'classic': return 'font-serif';
      case 'minimal': return 'font-light tracking-wide';
      default: return 'font-normal';
    }
  };

  const getHeroAlignmentClass = (alignment: string) => {
    switch (alignment) {
      case 'center': return 'text-center lg:text-center';
      case 'right': return 'text-right lg:text-right';
      default: return 'text-center lg:text-left';
    }
  };

  // Get intro styling
  const getIntroFontClass = (style: string) => {
    switch (style) {
      case 'elegant': return 'font-serif font-light';
      case 'bold': return 'font-bold';
      case 'handwritten': return 'font-mono';
      case 'classic': return 'font-serif';
      case 'minimal': return 'font-light tracking-wide';
      default: return 'font-normal';
    }
  };

  const getAlignmentClass = (alignment: string) => {
    switch (alignment) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  return (
    <div className="bg-gray-50" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Modern Hero with Split Layout */}
      <section className={`relative ${heroSection} flex items-center`}>
        {/* Only show dark background when no header image */}
        {!hasHeaderImage && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-blue-600 opacity-20"></div>
          </>
        )}
        
        {/* Header background image with optional opacity control */}
        {hasHeaderImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${customizationData.headerImageData?.url || customizationData.headerImageUrl})`,
              opacity: headerOpacity / 100
            }}
          ></div>
        )}
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid gap-6 lg:grid-cols-2 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className={`text-white ${getHeroAlignmentClass(customizationData.heroAlignment || 'left')}`}
            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            <h1 
              className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight ${getHeroFontClass(customizationData.heroFontStyle || 'modern')}`}
              style={{
                color: customizationData.heroTextColor || '#FFFFFF'
              }}
            >
              {customizationData.coachName || "Alex Johnson"}
            </h1>
            <p 
              className={`text-base sm:text-lg md:text-xl mb-6 sm:mb-8 leading-relaxed ${getHeroFontClass(customizationData.heroFontStyle || 'modern')}`}
              style={{
                color: customizationData.heroTextColor || '#D1D5DB'
              }}
            >
              {customizationData.tagline || "Transforming Lives Through Modern Coaching"}
            </p>
            <div className={`flex ${customizationData.heroAlignment === 'center' ? 'justify-center' : customizationData.heroAlignment === 'right' ? 'justify-end lg:justify-end' : 'justify-center lg:justify-start'}`}>
              <Button 
                className="py-3 px-6 sm:py-4 sm:px-8 text-sm sm:text-base min-h-[44px]"
                style={getButtonStyles()}
              >
                {customizationData.buttonText || "Start Your Journey"}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className={`${sectionPadding} bg-white`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <div className={getAlignmentClass(customizationData.introAlignment || 'left')}>
              <h2 
                className={`text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 drop-shadow-md ${getIntroFontClass(customizationData.introFontStyle || 'modern')}`}
                style={{ color: customizationData.introTextColor || '#111827' }}
              >
                {customizationData.introTitle || "About Me"}
              </h2>
              <p 
                className={`text-sm sm:text-base leading-relaxed drop-shadow-md ${getIntroFontClass(customizationData.introFontStyle || 'modern')}`}
                style={{ color: customizationData.introTextColor || '#6B7280' }}
              >
                {customizationData.bio || "I'm passionate about helping individuals unlock their full potential through personalized coaching approaches that blend modern techniques with timeless wisdom."}
              </p>
            </div>
            
            {(customizationData.aboutImageData?.url || customizationData.aboutImageUrl) && (
              <div className="order-first lg:order-last">
                <img
                  src={customizationData.aboutImageData?.url || customizationData.aboutImageUrl}
                  alt="About"
                  className="w-full h-48 sm:h-64 lg:h-80 object-cover rounded-xl shadow-lg"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className={`${sectionPadding} bg-gray-50`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-12 text-gray-900">Services</h2>
          {validServices.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {validServices.map((service: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    {(service.imageData?.url || service.imageUrl) ? (
                      <img
                        src={service.imageData?.url || service.imageUrl}
                        alt={service.title || 'Service'}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-xl flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: themeColor }}></div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900 break-words">
                        {service.title || 'Service'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed break-words">
                        {service.description || 'Professional service description'}
                      </p>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="text-lg sm:text-xl font-bold" style={{ color: themeColor }}>
                          {service.price || 'Contact for pricing'}
                        </div>
                        {hasValidPrice(service.price) ? (
                          <Button 
                            onClick={() => handlePurchaseClick(service, index)}
                            disabled={purchasingService === index}
                            className="min-h-[36px]"
                            style={{ backgroundColor: themeColor }}
                          >
                            {purchasingService === index ? "Processing..." : "Purchase"}
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full text-sm sm:text-base"
                          >
                            Explore →
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500">No services configured yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className={sectionPadding} style={{ backgroundColor: themeColor }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Ready to Transform Your Life?</h2>
          <p className="text-sm sm:text-base mb-4 sm:mb-6 opacity-90">Take the first step towards achieving your goals.</p>
          <Button 
            className="py-3 px-6 sm:py-4 sm:px-8 text-sm sm:text-base min-h-[44px]"
            style={getButtonStyles()}
          >
            {customizationData.buttonText || "Book Consultation"}
          </Button>
        </div>
      </section>
    </div>
  );
};
