
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

export const ModernTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const themeColor = customizationData.themeColor || '#6366F1';
  const fontFamily = customizationData.fontFamily || 'Inter';

  // Only adjust section height for preview, use responsive padding
  const sectionPadding = isPreview ? 'py-6' : 'py-8 sm:py-12 lg:py-16';
  const heroSection = isPreview ? 'py-8' : 'min-h-screen';

  return (
    <div className="bg-gray-50" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Modern Hero with Split Layout */}
      <section className={`relative ${heroSection} flex items-center`}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-blue-600 opacity-20"></div>
        
        {/* Header background image overlay */}
        {customizationData.headerImageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${customizationData.headerImageUrl})` }}
          ></div>
        )}
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid gap-6 lg:grid-cols-2 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-white text-center lg:text-left"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
              {customizationData.coachName || "Alex Johnson"}
            </h1>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-300 leading-relaxed">
              {customizationData.tagline || "Transforming Lives Through Modern Coaching"}
            </p>
            <div className="flex justify-center lg:justify-start">
              <Button 
                className="py-3 px-6 sm:py-4 sm:px-8 text-sm sm:text-base min-h-[44px]"
                style={{ backgroundColor: themeColor }}
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
            <div className="text-center lg:text-left">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-gray-900">About Me</h2>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {customizationData.bio || "I'm passionate about helping individuals unlock their full potential through personalized coaching approaches that blend modern techniques with timeless wisdom."}
              </p>
            </div>
            
            {customizationData.aboutImageUrl && (
              <div className="order-first lg:order-last">
                <img
                  src={customizationData.aboutImageUrl}
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
          <div className="space-y-4 sm:space-y-6">
            {(customizationData.services || []).map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  {service.imageUrl ? (
                    <img
                      src={service.imageUrl}
                      alt={service.title}
                      className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-xl flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: themeColor }}></div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900 break-words">{service.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed break-words">{service.description}</p>
                    <div className="text-lg sm:text-xl font-bold" style={{ color: themeColor }}>{service.price}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={sectionPadding} style={{ backgroundColor: themeColor }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Ready to Transform Your Life?</h2>
          <p className="text-sm sm:text-base mb-4 sm:mb-6 opacity-90">Take the first step towards achieving your goals.</p>
          <Button className="bg-white text-gray-900 hover:bg-gray-100 py-3 px-6 sm:py-4 sm:px-8 text-sm sm:text-base min-h-[44px]">
            {customizationData.buttonText || "Book Consultation"}
          </Button>
        </div>
      </section>
    </div>
  );
};
