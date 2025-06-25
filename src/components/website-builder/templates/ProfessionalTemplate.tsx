
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

export const ProfessionalTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [purchasingService, setPurchasingService] = useState<number | null>(null);
  
  const themeColor = customizationData.themeColor || '#1E40AF';
  const fontFamily = customizationData.fontFamily || 'Inter';

  // Helper function to get button styles
  const getButtonStyles = () => {
    const buttonColor = customizationData.buttonColor || themeColor;
    const buttonTextColor = customizationData.buttonTextColor || '#FFFFFF';
    const buttonFontFamily = customizationData.buttonFontFamily || fontFamily;
    const buttonStyle = customizationData.buttonStyle || 'bordered';
    
    return {
      backgroundColor: buttonStyle === 'bordered' ? 'transparent' : buttonColor,
      color: buttonTextColor,
      fontFamily: `${buttonFontFamily}, sans-serif`,
      border: buttonStyle === 'borderless' ? 'none' : `2px solid ${buttonColor}`,
      borderRadius: buttonStyle === 'borderless' ? '0' : undefined
    };
  };

  const sectionPadding = isPreview ? 'py-6' : 'py-12 sm:py-16 lg:py-20';

  // Check if header image exists
  const hasHeaderImage = customizationData.headerImageData?.url || customizationData.headerImageUrl;

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

  return (
    <div className="bg-white" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Professional Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: themeColor }}>
              {customizationData.coachName || "Executive Coach"}
            </div>
            <nav className="hidden md:flex space-x-6 lg:space-x-8">
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors text-sm lg:text-base">About</a>
              <a href="#services" className="text-gray-600 hover:text-gray-900 transition-colors text-sm lg:text-base">Services</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors text-sm lg:text-base">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Corporate Hero */}
      <section className={`${sectionPadding} ${!hasHeaderImage ? 'bg-gradient-to-r from-gray-50 to-blue-50' : 'relative'}`}>
        {/* Header background image with no opacity reduction */}
        {hasHeaderImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${customizationData.headerImageData?.url || customizationData.headerImageUrl})` }}
          ></div>
        )}
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <h1 className={`text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 leading-tight ${hasHeaderImage ? 'text-white' : 'text-gray-900'}`}>
                {customizationData.coachName || "Michael Thompson"}
              </h1>
              <p className={`text-lg sm:text-xl lg:text-2xl mb-6 sm:mb-8 leading-relaxed ${hasHeaderImage ? 'text-white' : 'text-gray-600'}`}>
                {customizationData.tagline || "Executive Leadership & Business Coaching"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8 justify-center lg:justify-start">
                <Button 
                  className="py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg min-h-[44px]"
                  style={getButtonStyles()}
                >
                  {customizationData.buttonText || "Schedule Consultation"}
                </Button>
                <Button 
                  variant="outline" 
                  className={`py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg min-h-[44px] ${
                    hasHeaderImage 
                      ? 'border-white text-white hover:bg-white hover:text-gray-900'
                      : 'border-gray-300'
                  }`}
                >
                  Download Brochure
                </Button>
              </div>
              <div className={`flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 lg:space-x-8 text-xs sm:text-sm justify-center lg:justify-start ${hasHeaderImage ? 'text-gray-300' : 'text-gray-500'}`}>
                <div>✓ 15+ Years Experience</div>
                <div>✓ Fortune 500 Clients</div>
                <div>✓ Proven Results</div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative mt-8 lg:mt-0"
            >
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-4 sm:p-6 lg:p-8 text-white shadow-2xl">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">500+</div>
                    <div className="text-blue-200 text-xs sm:text-sm">Executives Coached</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">95%</div>
                    <div className="text-blue-200 text-xs sm:text-sm">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">$2M+</div>
                    <div className="text-blue-200 text-xs sm:text-sm">ROI Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">15+</div>
                    <div className="text-blue-200 text-xs sm:text-sm">Years Experience</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Professional About */}
      <section id="about" className={`${sectionPadding} bg-white`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12 items-center">
            <div className="lg:col-span-2 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">Professional Excellence</h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                {customizationData.bio || "With over 15 years of experience in executive coaching and leadership development, I partner with senior leaders and organizations to drive sustainable performance improvements and strategic growth."}
              </p>
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <div className="flex items-start space-x-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: themeColor }}></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Strategic Leadership</h4>
                    <p className="text-gray-600 text-sm">Executive presence and decision-making</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: themeColor }}></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Team Performance</h4>
                    <p className="text-gray-600 text-sm">Building high-performing teams</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-first lg:order-last">
              {(customizationData.aboutImageData?.url || customizationData.aboutImageUrl) ? (
                <img
                  src={customizationData.aboutImageData?.url || customizationData.aboutImageUrl}
                  alt="Professional"
                  className="w-full h-32 sm:h-48 lg:h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="bg-gray-100 rounded-lg h-32 sm:h-48 lg:h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 lg:w-20 lg:h-20 mx-auto mb-2 sm:mb-4 rounded-full" style={{ backgroundColor: themeColor }}></div>
                    <div className="text-xs sm:text-sm">Professional Portrait</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className={`${sectionPadding} bg-gray-50`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 text-gray-900">Executive Services</h2>
            <p className="text-lg sm:text-xl text-gray-600">Tailored solutions for leadership excellence</p>
          </div>
          
          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {(customizationData.services || []).map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 shadow-sm hover:shadow-lg transition-shadow border"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg mb-4 sm:mb-6 flex items-center justify-center" style={{ backgroundColor: `${themeColor}15` }}>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded" style={{ backgroundColor: themeColor }}></div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 break-words">{service.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed break-words">{service.description}</p>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: themeColor }}>{service.price}</div>
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
                    <Button variant="outline" size="sm" className="min-h-[36px]">
                      Learn More
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Professional CTA */}
      <section className={sectionPadding} style={{ backgroundColor: themeColor }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
            {customizationData.footerHeading || "Ready to Elevate Your Leadership?"}
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90">
            {customizationData.footerSubheading || "Let's discuss how we can accelerate your professional growth."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg min-h-[44px]"
              style={getButtonStyles()}
            >
              {customizationData.buttonText || "Book Strategy Session"}
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg min-h-[44px]">
              View Case Studies
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-3 sm:mb-4" style={{ color: themeColor }}>
            {customizationData.coachName || "Executive Coach"}
          </div>
          <p className="text-gray-400 text-sm sm:text-base">Professional coaching for executive excellence</p>
        </div>
      </footer>
    </div>
  );
};
