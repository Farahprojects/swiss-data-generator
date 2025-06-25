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

export const MinimalTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [purchasingService, setPurchasingService] = useState<number | null>(null);
  
  const themeColor = customizationData.themeColor || '#10B981';
  const fontFamily = customizationData.fontFamily || 'Inter';

  const sectionPadding = isPreview ? 'py-6' : 'py-16 sm:py-24 lg:py-32';
  const heroSection = isPreview ? 'py-8' : 'min-h-screen';

  // Check if header image exists
  const hasHeaderImage = customizationData.headerImageData?.url || customizationData.headerImageUrl;

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
    <div className="bg-white" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Ultra Minimal Hero */}
      <section className={`${heroSection} flex items-center justify-center relative ${!hasHeaderImage ? 'bg-white' : ''}`}>
        {/* Header background image with no opacity reduction */}
        {hasHeaderImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${customizationData.headerImageData?.url || customizationData.headerImageUrl})` }}
          ></div>
        )}
        
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{ textShadow: hasHeaderImage ? '2px 2px 4px rgba(0,0,0,0.7)' : 'none' }}
          >
            <h1 className={`text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-light mb-6 sm:mb-8 tracking-wide leading-tight ${hasHeaderImage ? 'text-white' : 'text-gray-900'}`}>
              {customizationData.coachName || "Maria Chen"}
            </h1>
            <div className={`w-12 sm:w-16 h-px mx-auto mb-6 sm:mb-8 ${hasHeaderImage ? 'bg-white' : 'bg-gray-900'}`}></div>
            <p className={`text-base sm:text-lg lg:text-xl mb-8 sm:mb-12 font-light leading-relaxed ${hasHeaderImage ? 'text-gray-200' : 'text-gray-600'}`}>
              {customizationData.tagline || "Simplicity in growth. Clarity in purpose."}
            </p>
            <Button 
              variant="outline"
              className={`font-light tracking-wide py-3 px-6 sm:py-3 sm:px-8 min-h-[44px] ${
                hasHeaderImage 
                  ? 'border-white text-white hover:bg-white hover:text-gray-900' 
                  : 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
              }`}
            >
              {customizationData.buttonText || "Connect"}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Clean About */}
      <section className={`${sectionPadding} bg-gray-50`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className={getAlignmentClass(customizationData.introAlignment || 'left')}
          >
            <h2 
              className={`text-2xl sm:text-3xl mb-8 sm:mb-12 ${getIntroFontClass(customizationData.introFontStyle || 'modern')}`}
              style={{ color: customizationData.introTextColor || '#374151' }}
            >
              {customizationData.introTitle || "About Me"}
            </h2>
            
            {(customizationData.aboutImageData?.url || customizationData.aboutImageUrl) && (
              <div className="mb-8 sm:mb-12">
                <img
                  src={customizationData.aboutImageData?.url || customizationData.aboutImageUrl}
                  alt="About"
                  className="w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 object-cover rounded-full mx-auto shadow-lg"
                />
              </div>
            )}
            
            <p 
              className={`text-base sm:text-lg leading-relaxed ${getIntroFontClass(customizationData.introFontStyle || 'modern')}`}
              style={{ color: customizationData.introTextColor || '#6B7280' }}
            >
              {customizationData.bio || "I believe in the power of quiet transformation. Through mindful conversations and gentle guidance, we explore pathways to authentic growth."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Minimal Services List */}
      <section className={`${sectionPadding} bg-white`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-light mb-12 sm:mb-16 text-gray-900 text-center">Services</h2>
          {validServices.length > 0 ? (
            <div className="space-y-8 sm:space-y-12 lg:space-y-16">
              {validServices.map((service: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="border-b border-gray-100 pb-6 sm:pb-8 lg:pb-12 last:border-b-0"
                >
                  <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-3 items-start lg:items-center">
                    <h3 className="text-lg sm:text-xl font-light text-gray-900 break-words">
                      {service.title || 'Service'}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 font-light lg:col-span-1 leading-relaxed break-words">
                      {service.description || 'Professional service description'}
                    </p>
                    <div className="flex items-center justify-between lg:justify-end gap-4 flex-wrap">
                      <span className="text-base sm:text-lg font-light text-gray-900">
                        {service.price || 'Contact for pricing'}
                      </span>
                      {hasValidPrice(service.price) ? (
                        <Button 
                          onClick={() => handlePurchaseClick(service, index)}
                          disabled={purchasingService === index}
                          className="font-light min-h-[36px]"
                          style={{ backgroundColor: themeColor }}
                        >
                          {purchasingService === index ? "Processing..." : "Purchase"}
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          className="text-gray-600 hover:text-gray-900 font-light p-0 h-auto text-sm sm:text-base"
                        >
                          Details →
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500 font-light">No services configured yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Minimal CTA */}
      <section className={`${sectionPadding} bg-gray-50`}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-light mb-6 sm:mb-8 text-gray-900">Let's Begin</h2>
          <p className="text-base sm:text-lg text-gray-600 font-light mb-8 sm:mb-12">Simple. Focused. Transformative.</p>
          <Button 
            className="font-light tracking-wide py-3 px-6 sm:py-3 sm:px-8 min-h-[44px]"
            style={{ backgroundColor: themeColor }}
          >
            {customizationData.buttonText || "Start Conversation"}
          </Button>
        </div>
      </section>
    </div>
  );
};
