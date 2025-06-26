
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { handleServicePurchase, hasValidPrice } from "@/utils/servicePurchase";
import { EnhancedInlineText } from "../EnhancedInlineText";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
  onCustomizationChange?: (field: string, value: any) => void;
}

export const CreativeTemplate = ({ customizationData, isPreview = false, onCustomizationChange }: TemplateProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [purchasingService, setPurchasingService] = useState<number | null>(null);
  
  const themeColor = customizationData.themeColor || '#F59E0B';
  const fontFamily = customizationData.fontFamily || 'Poppins';
  const isEditable = !!onCustomizationChange;

  const sectionPadding = isPreview ? 'py-6' : 'py-12 sm:py-16 lg:py-20';
  const heroSection = isPreview ? 'py-8' : 'min-h-screen';

  // Check if header image exists
  const hasHeaderImage = customizationData.headerImageData?.url || customizationData.headerImageUrl;

  // Create report service card with customizable data
  const reportService = {
    title: customizationData.reportService?.title || "Creative Insights Report",
    description: customizationData.reportService?.description || "Discover your unique creative potential and unlock innovative pathways to personal and professional growth.",
    price: customizationData.reportService?.price || "$29",
    isReportService: true
  };

  // Filter out null services and ensure we have valid service objects
  const validServices = (customizationData.services || [])
    .filter((service: any) => service && typeof service === 'object')
    .filter((service: any) => service.title || service.description || service.price);

  // Add report service as first item always (including preview)
  const allServices = [reportService, ...validServices];

  const handleFieldChange = (field: string, value: any) => {
    if (onCustomizationChange) {
      onCustomizationChange(field, value);
    }
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

  // Helper function to get button styling
  const getButtonStyles = (isSecondary = false) => {
    const buttonColor = customizationData.buttonColor || themeColor;
    const buttonTextColor = customizationData.buttonTextColor || '#FFFFFF';
    
    if (isSecondary) {
      return {
        backgroundColor: 'transparent',
        color: buttonColor,
        border: `2px solid ${buttonColor}`,
      };
    }
    
    return {
      background: `linear-gradient(135deg, ${buttonColor}, #ec4899)`,
      color: buttonTextColor,
      border: 'none',
    };
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Creative Asymmetric Hero */}
      <section className={`relative ${heroSection} overflow-hidden`}>
        {/* Only show decorative elements when no header image */}
        {!hasHeaderImage && (
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-24 h-24 sm:w-36 sm:h-36 lg:w-72 lg:h-72 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full transform -translate-x-12 -translate-y-12 sm:-translate-x-18 sm:-translate-y-18 lg:-translate-x-32 lg:-translate-y-32 opacity-70"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-96 lg:h-96 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full transform translate-x-16 translate-y-16 sm:translate-x-24 sm:translate-y-24 lg:translate-x-48 lg:translate-y-48 opacity-60"></div>
            <div className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-32 sm:h-32 lg:w-64 lg:h-64 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-50"></div>
          </div>
        )}
        
        {hasHeaderImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${customizationData.headerImageData?.url || customizationData.headerImageUrl})` }}
          ></div>
        )}
        
        <div className={`relative z-10 ${heroSection} flex items-center`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, type: "spring" }}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent leading-tight">
                  <EnhancedInlineText
                    value={customizationData.coachName || ""}
                    onChange={(value) => handleFieldChange('coachName', value)}
                    placeholder="Jamie Rivers"
                    isEditable={isEditable}
                    fieldName="coachName"
                    formatting={customizationData.coachNameFormatting}
                    onCustomizationChange={onCustomizationChange}
                    className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent leading-tight"
                  />
                </h1>
                <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-700 leading-relaxed">
                  <EnhancedInlineText
                    value={customizationData.tagline || ""}
                    onChange={(value) => handleFieldChange('tagline', value)}
                    placeholder="Unleashing Creativity Through Innovative Coaching"
                    multiline={true}
                    isEditable={isEditable}
                    fieldName="tagline"
                    formatting={customizationData.taglineFormatting}
                    onCustomizationChange={onCustomizationChange}
                    className="text-lg sm:text-xl text-gray-700 leading-relaxed"
                  />
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                  <Button 
                    className="py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg rounded-full shadow-lg transform hover:scale-105 transition-transform min-h-[44px]"
                    style={getButtonStyles()}
                  >
                    <EnhancedInlineText
                      value={customizationData.buttonText || ""}
                      onChange={(value) => handleFieldChange('buttonText', value)}
                      placeholder="Spark Innovation"
                      isEditable={isEditable}
                      fieldName="buttonText"
                      formatting={customizationData.buttonTextFormatting}
                      onCustomizationChange={onCustomizationChange}
                      className="text-inherit"
                    />
                  </Button>
                  <Button 
                    className="py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg rounded-full border-2 hover:bg-white hover:shadow-lg transition-all min-h-[44px]"
                    style={getButtonStyles(true)}
                  >
                    Explore Methods
                  </Button>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, rotate: -10 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative mt-8 lg:mt-0"
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-3 sm:space-y-4">
                  <div className="h-12 sm:h-16 lg:h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl transform rotate-3"></div>
                  <div className="h-16 sm:h-24 lg:h-48 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl transform -rotate-2"></div>
                </div>
                <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4 lg:mt-8">
                  <div className="h-14 sm:h-20 lg:h-40 bg-gradient-to-br from-blue-400 to-teal-500 rounded-2xl transform rotate-1"></div>
                  <div className="h-12 sm:h-18 lg:h-36 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl transform -rotate-3"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Creative About with Floating Elements */}
      <section className={`${sectionPadding} relative`}>
        {/* Only show decorative elements when no header image */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-4 sm:left-10 w-12 h-12 sm:w-16 sm:h-16 lg:w-32 lg:h-32 bg-yellow-300 rounded-full opacity-30 animate-float"></div>
          <div className="absolute bottom-10 right-4 sm:right-10 w-8 h-8 sm:w-12 sm:h-12 lg:w-24 lg:h-24 bg-pink-300 rounded-full opacity-40 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                <EnhancedInlineText
                  value={customizationData.introTitle || ""}
                  onChange={(value) => handleFieldChange('introTitle', value)}
                  placeholder="Creative Vision"
                  isEditable={isEditable}
                  fieldName="introTitle"
                  formatting={customizationData.introTitleFormatting}
                  onCustomizationChange={onCustomizationChange}
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent"
                />
              </h2>
              <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 leading-relaxed">
                <EnhancedInlineText
                  value={customizationData.bio || ""}
                  onChange={(value) => handleFieldChange('bio', value)}
                  placeholder="I believe creativity is the key to unlocking human potential. Through innovative approaches and bold thinking, we create transformative experiences that inspire lasting change."
                  multiline={true}
                  isEditable={isEditable}
                  fieldName="bio"
                  formatting={customizationData.bioFormatting}
                  onCustomizationChange={onCustomizationChange}
                  className="text-base sm:text-lg text-gray-700 leading-relaxed"
                />
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <div className="bg-white/70 rounded-full px-4 py-2 text-sm font-medium text-purple-700">Innovation</div>
                <div className="bg-white/70 rounded-full px-4 py-2 text-sm font-medium text-pink-700">Creativity</div>
                <div className="bg-white/70 rounded-full px-4 py-2 text-sm font-medium text-orange-700">Growth</div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-first lg:order-last"
            >
              {(customizationData.aboutImageData?.url || customizationData.aboutImageUrl) ? (
                <div className="relative">
                  <img
                    src={customizationData.aboutImageData?.url || customizationData.aboutImageUrl}
                    alt="Creative Vision"
                    className="w-full h-64 sm:h-80 lg:h-96 object-cover rounded-3xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300"
                  />
                  <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-80"></div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-full h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 rounded-3xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-300"></div>
                  <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-80"></div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Dynamic Services Grid */}
      <section className={`${sectionPadding} bg-white/50 backdrop-blur-sm`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              {customizationData.reportService?.sectionHeading || "Creative Services"}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">Innovative solutions for every vision</p>
          </div>
          
          {allServices.length > 0 ? (
            <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {allServices.map((service: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30, rotate: index % 2 === 0 ? -5 : 5 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  {(service.imageData?.url || service.imageUrl) && (
                    <img
                      src={service.imageData?.url || service.imageUrl}
                      alt={service.title || 'Service'}
                      className="w-full h-32 sm:h-40 object-cover rounded-2xl mb-4 sm:mb-6"
                    />
                  )}
                  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900 break-words">
                    {service.title || 'Service'}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed break-words">
                    {service.description || 'Professional service description'}
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                      {service.price || 'Contact for pricing'}
                    </div>
                    {service.isReportService ? (
                      <Button 
                        onClick={() => handlePurchaseClick(service, index)}
                        className="rounded-full min-h-[36px] transform hover:scale-105 transition-transform"
                        style={getButtonStyles()}
                      >
                        Get Report
                      </Button>
                    ) : hasValidPrice(service.price) ? (
                      <Button 
                        onClick={() => handlePurchaseClick(service, index)}
                        disabled={purchasingService === index}
                        className="rounded-full min-h-[36px] transform hover:scale-105 transition-transform"
                        style={getButtonStyles()}
                      >
                        {purchasingService === index ? "Processing..." : "Purchase"}
                      </Button>
                    ) : (
                      <Button 
                        className="rounded-full min-h-[36px] transform hover:scale-105 transition-transform"
                        style={getButtonStyles(true)}
                      >
                        Explore
                      </Button>
                    )}
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

      {/* Vibrant CTA */}
      <section className={`${sectionPadding} bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <EnhancedInlineText
              value={customizationData.footerHeading || ""}
              onChange={(value) => handleFieldChange('footerHeading', value)}
              placeholder="Ready to Create Magic?"
              isEditable={isEditable}
              fieldName="footerHeading"
              formatting={customizationData.footerHeadingFormatting || { color: '#FFFFFF' }}
              onCustomizationChange={onCustomizationChange}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white"
            />
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90">
            <EnhancedInlineText
              value={customizationData.footerSubheading || ""}
              onChange={(value) => handleFieldChange('footerSubheading', value)}
              placeholder="Let's unleash your creative potential together."
              multiline={true}
              isEditable={isEditable}
              fieldName="footerSubheading"
              formatting={customizationData.footerSubheadingFormatting || { color: '#FFFFFF' }}
              onCustomizationChange={onCustomizationChange}
              className="text-lg sm:text-xl opacity-90 text-white"
            />
          </p>
          <Button 
            className="py-4 px-8 sm:py-5 sm:px-10 text-lg sm:text-xl font-bold rounded-full bg-white text-purple-600 hover:bg-gray-100 shadow-xl transform hover:scale-105 transition-all min-h-[50px]"
          >
            <EnhancedInlineText
              value={customizationData.buttonText || ""}
              onChange={(value) => handleFieldChange('buttonText', value)}
              placeholder="Start Creating"
              isEditable={isEditable}
              fieldName="buttonText"
              formatting={customizationData.buttonTextFormatting || { color: '#7C3AED' }}
              onCustomizationChange={onCustomizationChange}
              className="text-purple-600"
            />
          </Button>
        </div>
      </section>
    </div>
  );
};
