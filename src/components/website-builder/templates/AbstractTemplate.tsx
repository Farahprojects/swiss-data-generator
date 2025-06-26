
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { handleServicePurchase, hasValidPrice } from "@/utils/servicePurchase";
import { getValidImageUrl } from "@/utils/imageValidation";

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

export const AbstractTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [purchasingService, setPurchasingService] = useState<number | null>(null);
  
  const themeColor = customizationData.themeColor || '#6B46C1';
  const fontFamily = customizationData.fontFamily || 'Inter';

  const sectionPadding = isPreview ? 'py-6' : 'py-16 sm:py-24 lg:py-32';
  const heroSection = isPreview ? 'py-8' : 'min-h-screen';

  // Check if header image exists and is valid
  const headerImageUrl = getValidImageUrl(customizationData.headerImageData || customizationData.headerImageUrl);
  const aboutImageUrl = getValidImageUrl(customizationData.aboutImageData || customizationData.aboutImageUrl);

  // Create report service card with customizable data
  const reportService = {
    title: customizationData.reportService?.title || "Personal Insights Report",
    description: customizationData.reportService?.description || "An artistic exploration of your psyche through abstract psychological analysis and creative interpretation.",
    price: customizationData.reportService?.price || "$29",
    isReportService: true
  };

  // Filter out null services and ensure we have valid service objects
  const validServices = validateServices(customizationData.services || []);
  
  // Add report service as first item always (including preview)
  const allServices = [reportService, ...validServices];

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
  const getButtonStyles = (isOutline = false) => {
    const buttonColor = customizationData.buttonColor || themeColor;
    const buttonTextColor = customizationData.buttonTextColor || '#FFFFFF';
    const buttonFontFamily = customizationData.buttonFontFamily || fontFamily;
    const buttonStyle = customizationData.buttonStyle || 'bordered';
    
    if (isOutline) {
      return {
        fontFamily: `${buttonFontFamily}, sans-serif`,
        backgroundColor: 'transparent',
        color: buttonColor,
        border: buttonStyle === 'bordered' ? `2px solid ${buttonColor}` : 'none',
        borderRadius: '0',
        clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
      };
    }
    
    return {
      fontFamily: `${buttonFontFamily}, sans-serif`,
      backgroundColor: buttonColor,
      color: buttonTextColor,
      border: buttonStyle === 'bordered' ? `2px solid ${buttonColor}` : 'none',
      borderRadius: '0',
      clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
    };
  };

  // Abstract geometric shapes component
  const GeometricShapes = ({ variant = 'default' }: { variant?: string }) => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large floating triangle */}
      <motion.div
        className="absolute -top-32 -right-32 w-64 h-64"
        style={{ 
          background: `linear-gradient(135deg, ${themeColor}20, ${themeColor}10)`,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Floating circles */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-16 h-16 rounded-full opacity-30"
        style={{ backgroundColor: themeColor }}
        animate={{
          y: [-20, 20, -20],
          x: [-10, 10, -10]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Abstract polygon */}
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-32 h-32 opacity-20"
        style={{ 
          backgroundColor: themeColor,
          clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)'
        }}
        animate={{
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Morphing blob */}
      <motion.div
        className="absolute top-1/2 left-1/6 w-24 h-24 opacity-15"
        style={{ backgroundColor: themeColor }}
        animate={{
          borderRadius: [
            "30% 70% 70% 30% / 30% 30% 70% 70%",
            "70% 30% 30% 70% / 70% 70% 30% 30%",
            "30% 70% 70% 30% / 30% 30% 70% 70%"
          ]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Abstract Geometric Hero */}
      <section className={`${heroSection} relative flex items-center justify-center overflow-hidden`}>
        {/* Header background image with artistic overlay */}
        {headerImageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${headerImageUrl})`,
              filter: 'grayscale(30%) contrast(120%)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-purple-900/40 to-black/60"></div>
          </div>
        )}
        
        {/* Geometric background shapes */}
        <GeometricShapes />
        
        {/* Floating content card */}
        <motion.div
          initial={{ opacity: 0, y: 50, rotateX: 15 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6"
        >
          <div 
            className="backdrop-blur-sm border border-white/20 p-8 sm:p-12"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
            }}
          >
            <motion.h1 
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 sm:mb-8 text-white leading-tight"
              style={{ fontFamily: `${fontFamily}, sans-serif` }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {customizationData.coachName || "Abstract Mind"}
            </motion.h1>
            
            <motion.div 
              className="h-1 mb-6 sm:mb-8"
              style={{ 
                background: `linear-gradient(90deg, ${themeColor}, transparent)`,
                clipPath: 'polygon(0 0, 70% 0, 100% 100%, 0 100%)'
              }}
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: 0.6, duration: 1 }}
            />
            
            <motion.p 
              className="text-lg sm:text-xl lg:text-2xl mb-8 sm:mb-12 text-gray-200 leading-relaxed font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
            >
              {customizationData.tagline || "Where consciousness meets creativity in transformative coaching"}
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                className="py-3 px-8 sm:py-4 sm:px-10 text-base sm:text-lg min-h-[44px] hover:opacity-90 transition-all duration-300 transform hover:scale-105"
                style={getButtonStyles()}
              >
                {customizationData.buttonText || "Explore Dimensions"}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Diagonal Split About Section */}
      <section className={`${sectionPadding} relative overflow-hidden`}>
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #1e1b4b 100%)'
          }}
        />
        
        {/* Abstract pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="abstract-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <polygon points="50,0 100,50 50,100 0,50" fill={themeColor} opacity="0.3"/>
                <circle cx="25" cy="25" r="10" fill={themeColor} opacity="0.2"/>
                <polygon points="75,25 100,50 75,75 50,50" fill={themeColor} opacity="0.4"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#abstract-pattern)"/>
          </svg>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid gap-8 lg:gap-16 lg:grid-cols-2 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-white"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8">
                {customizationData.introTitle || "Philosophy in Motion"}
              </h2>
              <p className="text-base sm:text-lg text-gray-200 leading-relaxed mb-6 sm:mb-8">
                {customizationData.bio || "Through abstract thinking and creative methodologies, I guide individuals toward profound self-discovery. Each session is a unique canvas where traditional coaching meets artistic expression."}
              </p>
              <div 
                className="h-1 w-32"
                style={{ 
                  background: `linear-gradient(90deg, ${themeColor}, transparent)`,
                  clipPath: 'polygon(0 0, 80% 0, 100% 100%, 0 100%)'
                }}
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              {aboutImageUrl ? (
                <div 
                  className="relative overflow-hidden"
                  style={{
                    clipPath: 'polygon(20% 0%, 100% 0%, 100% 80%, 80% 100%, 0% 100%, 0% 20%)'
                  }}
                >
                  <img
                    src={aboutImageUrl}
                    alt="About"
                    className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-transparent"></div>
                </div>
              ) : (
                <div 
                  className="w-full h-64 sm:h-80 lg:h-96 relative"
                  style={{
                    background: `linear-gradient(135deg, ${themeColor}40, ${themeColor}20)`,
                    clipPath: 'polygon(20% 0%, 100% 0%, 100% 80%, 80% 100%, 0% 100%, 0% 20%)'
                  }}
                >
                  {/* Abstract geometric placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="w-32 h-32 opacity-50"
                      style={{
                        background: themeColor,
                        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Geometric Services Grid */}
      <section className={`${sectionPadding} relative`}>
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(225deg, #0f0f23 0%, #1e1b4b 50%, #0f0f23 100%)'
          }}
        />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-white">
              {customizationData.reportService?.sectionHeading || "Transformative Experiences"}
            </h2>
            <div 
              className="h-1 w-24 mx-auto"
              style={{ 
                background: `linear-gradient(90deg, ${themeColor}, transparent)`,
                clipPath: 'polygon(0 0, 80% 0, 100% 100%, 0 100%)'
              }}
            />
          </motion.div>
          
          {allServices.length > 0 ? (
            <div className="grid gap-8 sm:gap-12 lg:grid-cols-2">
              {allServices.map((service: any, index: number) => {
                const serviceImageUrl = getValidImageUrl(service.imageData || service.imageUrl);
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50, rotateY: 15 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.2 }}
                    className="group relative"
                  >
                    <div 
                      className="backdrop-blur-sm border border-white/10 p-6 sm:p-8 transition-all duration-500 hover:border-white/30 group-hover:transform group-hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                        clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))'
                      }}
                    >
                      {serviceImageUrl && (
                        <div 
                          className="mb-6 overflow-hidden"
                          style={{
                            clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)'
                          }}
                        >
                          <img
                            src={serviceImageUrl}
                            alt={service.title || 'Service'}
                            className="w-full h-32 sm:h-40 object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        </div>
                      )}
                      
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-4 text-white break-words">
                        {service.title || 'Abstract Service'}
                      </h3>
                      
                      <p className="text-sm sm:text-base text-gray-300 mb-6 leading-relaxed break-words">
                        {service.description || 'A unique coaching experience that transcends traditional boundaries'}
                      </p>
                      
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <span className="text-lg sm:text-xl font-bold text-white">
                          {service.price || 'Contact for details'}
                        </span>
                        
                        {service.isReportService ? (
                          <Button 
                            onClick={() => handlePurchaseClick(service, index)}
                            className="min-h-[40px] hover:opacity-90 transition-all duration-300 transform hover:scale-105"
                            style={getButtonStyles()}
                          >
                            Get Report
                          </Button>
                        ) : hasValidPrice(service.price) ? (
                          <Button 
                            onClick={() => handlePurchaseClick(service, index)}
                            disabled={purchasingService === index}
                            className="min-h-[40px] hover:opacity-90 transition-all duration-300 transform hover:scale-105"
                            style={getButtonStyles()}
                          >
                            {purchasingService === index ? "Processing..." : "Experience"}
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost"
                            className="text-gray-300 hover:text-white p-0 h-auto text-sm sm:text-base"
                          >
                            Explore →
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
              <p className="text-gray-400">No experiences configured yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Morphing CTA Section */}
      <section className={`${sectionPadding} relative overflow-hidden`}>
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${themeColor}20, #1e1b4b, ${themeColor}20)`
          }}
        />
        
        {/* Morphing background shapes */}
        <div className="absolute inset-0 opacity-20">
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64"
            style={{ backgroundColor: themeColor }}
            animate={{
              borderRadius: [
                "20% 80% 80% 20% / 20% 20% 80% 80%",
                "80% 20% 20% 80% / 80% 80% 20% 20%",
                "20% 80% 80% 20% / 20% 20% 80% 80%"
              ],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-48 h-48"
            style={{ backgroundColor: themeColor }}
            animate={{
              borderRadius: [
                "60% 40% 30% 70% / 60% 30% 70% 40%",
                "30% 60% 70% 40% / 50% 60% 30% 60%",
                "60% 40% 30% 70% / 60% 30% 70% 40%"
              ],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.h2 
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8 text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {customizationData.footerHeading || "Ready to Transcend?"}
          </motion.h2>
          
          <motion.p 
            className="text-lg sm:text-xl mb-8 sm:mb-12 text-gray-200 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            {customizationData.footerSubheading || "Step into a realm where transformation takes artistic form"}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <Button 
              className="py-3 px-8 sm:py-4 sm:px-12 text-base sm:text-lg min-h-[44px] hover:opacity-90 transition-all duration-300 transform hover:scale-105"
              style={getButtonStyles()}
            >
              {customizationData.buttonText || "Begin Transformation"}
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
