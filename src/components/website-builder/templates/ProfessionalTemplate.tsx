
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { handleServicePurchase, hasValidPrice } from "@/utils/servicePurchase";
import { ArrowRight, Star } from "lucide-react";
import { EnhancedInlineText } from "../EnhancedInlineText";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
  onCustomizationChange?: (field: string, value: any) => void;
}

export const ProfessionalTemplate = ({ customizationData, isPreview = false, onCustomizationChange }: TemplateProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [purchasingService, setPurchasingService] = useState<number | null>(null);
  
  const themeColor = customizationData.themeColor || '#007AFF';
  const fontFamily = customizationData.fontFamily || 'Inter';
  const sectionPadding = isPreview ? 'py-12' : 'py-16 sm:py-20 lg:py-24';
  const hasHeaderImage = customizationData.headerImageData?.url || customizationData.headerImageUrl;
  const isEditable = !!onCustomizationChange;

  // Create report service card - ALWAYS show it
  const reportService = {
    title: "Personal Insights Report",
    description: "Comprehensive analysis designed for your unique journey and goals.",
    price: "$29",
    isReportService: true
  };

  // Add report service as first item
  const allServices = [reportService, ...(customizationData.services || [])];

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

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: `${fontFamily}, -apple-system, BlinkMacSystemFont, sans-serif` }}>
      {/* Apple-style Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold text-gray-900 tracking-tight mr-16">
              <EnhancedInlineText
                value={customizationData.coachName || ""}
                onChange={(value) => handleFieldChange('coachName', value)}
                placeholder="Your Name"
                isEditable={isEditable}
                fieldName="coachName"
                formatting={customizationData.coachNameFormatting}
                onCustomizationChange={onCustomizationChange}
                className="text-2xl font-semibold text-gray-900 tracking-tight"
              />
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">About</a>
              <a href="#services" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Services</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Simplified Hero Section - Apple Style */}
      <section className={`${sectionPadding} relative overflow-hidden`}>
        {hasHeaderImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-5"
            style={{ backgroundImage: `url(${customizationData.headerImageData?.url || customizationData.headerImageUrl})` }}
          />
        )}
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 mb-8 leading-none tracking-tight">
              <EnhancedInlineText
                value={customizationData.heroTitle || ""}
                onChange={(value) => handleFieldChange('heroTitle', value)}
                placeholder="Discover your true potential."
                isEditable={isEditable}
                fieldName="heroTitle"
                formatting={customizationData.heroTitleFormatting}
                onCustomizationChange={onCustomizationChange}
                className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-gray-900 leading-none tracking-tight"
              />
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 font-light leading-relaxed max-w-3xl mx-auto">
              <EnhancedInlineText
                value={customizationData.tagline || ""}
                onChange={(value) => handleFieldChange('tagline', value)}
                placeholder="Personalized insights that illuminate your unique path forward"
                multiline={true}
                isEditable={isEditable}
                fieldName="tagline"
                formatting={customizationData.taglineFormatting}
                onCustomizationChange={onCustomizationChange}
                className="text-xl sm:text-2xl text-gray-600 font-light leading-relaxed"
              />
            </p>
            
            <Button 
              className="h-12 px-8 text-base font-medium rounded-full transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: themeColor, color: 'white' }}
            >
              <EnhancedInlineText
                value={customizationData.buttonText || ""}
                onChange={(value) => handleFieldChange('buttonText', value)}
                placeholder="Get Your Insights"
                isEditable={isEditable}
                fieldName="buttonText"
                formatting={customizationData.buttonTextFormatting}
                onCustomizationChange={onCustomizationChange}
                className="text-white"
              />
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Clean About Section - Apple Inspired */}
      <section className={`${sectionPadding} bg-white`}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid gap-20 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              {(customizationData.aboutImageData?.url || customizationData.aboutImageUrl) ? (
                <div className="relative">
                  <img
                    src={customizationData.aboutImageData?.url || customizationData.aboutImageUrl}
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
                <EnhancedInlineText
                  value={customizationData.introTitle || ""}
                  onChange={(value) => handleFieldChange('introTitle', value)}
                  placeholder="Designed for you."
                  isEditable={isEditable}
                  fieldName="introTitle"
                  formatting={customizationData.introTitleFormatting}
                  onCustomizationChange={onCustomizationChange}
                  className="text-4xl sm:text-5xl font-light text-gray-900 tracking-tight leading-tight"
                />
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-12 font-light">
                <EnhancedInlineText
                  value={customizationData.bio || ""}
                  onChange={(value) => handleFieldChange('bio', value)}
                  placeholder="Every insight is crafted with precision, tailored to your unique story and timing. No generic advice—just clarity designed specifically for your journey."
                  multiline={true}
                  isEditable={isEditable}
                  fieldName="bio"
                  formatting={customizationData.bioFormatting}
                  onCustomizationChange={onCustomizationChange}
                  className="text-xl text-gray-600 leading-relaxed font-light"
                />
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
              <EnhancedInlineText
                value={customizationData.servicesTitle || ""}
                onChange={(value) => handleFieldChange('servicesTitle', value)}
                placeholder="Simple. Clear. Transformative."
                isEditable={isEditable}
                fieldName="servicesTitle"
                formatting={customizationData.servicesTitleFormatting}
                onCustomizationChange={onCustomizationChange}
                className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight"
              />
            </h2>
            <p className="text-xl text-gray-600 font-light">
              <EnhancedInlineText
                value={customizationData.servicesSubtitle || ""}
                onChange={(value) => handleFieldChange('servicesSubtitle', value)}
                placeholder="Choose your path forward"
                isEditable={isEditable}
                fieldName="servicesSubtitle"
                formatting={customizationData.servicesSubtitleFormatting}
                onCustomizationChange={onCustomizationChange}
                className="text-xl text-gray-600 font-light"
              />
            </p>
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
            <EnhancedInlineText
              value={customizationData.footerHeading || ""}
              onChange={(value) => handleFieldChange('footerHeading', value)}
              placeholder="Ready to begin?"
              isEditable={isEditable}
              fieldName="footerHeading"
              formatting={customizationData.footerHeadingFormatting}
              onCustomizationChange={onCustomizationChange}
              className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight"
            />
          </h2>
          <p className="text-xl text-gray-600 mb-12 font-light leading-relaxed">
            <EnhancedInlineText
              value={customizationData.footerSubheading || ""}
              onChange={(value) => handleFieldChange('footerSubheading', value)}
              placeholder="Your personalized insights are just a few clicks away."
              multiline={true}
              isEditable={isEditable}
              fieldName="footerSubheading"
              formatting={customizationData.footerSubheadingFormatting}
              onCustomizationChange={onCustomizationChange}
              className="text-xl text-gray-600 font-light leading-relaxed"
            />
          </p>
          <Button 
            className="h-14 px-10 text-lg font-medium rounded-full transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: themeColor, color: 'white' }}
          >
            <EnhancedInlineText
              value={customizationData.buttonText || ""}
              onChange={(value) => handleFieldChange('buttonText', value)}
              placeholder="Get Your Insights"
              isEditable={isEditable}
              fieldName="buttonText"
              formatting={customizationData.buttonTextFormatting}
              onCustomizationChange={onCustomizationChange}
              className="text-white"
            />
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-white py-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center">
            <div className="text-2xl font-semibold mb-4 text-gray-900 tracking-tight">
              <EnhancedInlineText
                value={customizationData.coachName || ""}
                onChange={(value) => handleFieldChange('coachName', value)}
                placeholder="Your Name"
                isEditable={isEditable}
                fieldName="coachName"
                formatting={customizationData.coachNameFormatting}
                onCustomizationChange={onCustomizationChange}
                className="text-2xl font-semibold text-gray-900 tracking-tight"
              />
            </div>
            <p className="text-gray-600 mb-8 font-light">
              <EnhancedInlineText
                value={customizationData.footerTagline || ""}
                onChange={(value) => handleFieldChange('footerTagline', value)}
                placeholder="Personalized insights for your unique journey"
                isEditable={isEditable}
                fieldName="footerTagline"
                formatting={customizationData.footerTaglineFormatting}
                onCustomizationChange={onCustomizationChange}
                className="text-gray-600 font-light"
              />
            </p>
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
