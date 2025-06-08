
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

export const ClassicTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const themeColor = customizationData.themeColor || '#8B5CF6';
  const fontFamily = customizationData.fontFamily || 'Playfair Display';

  const sectionPadding = isPreview ? 'py-6' : 'py-12 sm:py-16 lg:py-20';
  const heroPadding = isPreview ? 'py-8' : 'py-16 sm:py-24 lg:py-32';

  return (
    <div className="bg-cream-50" style={{ fontFamily: `${fontFamily}, serif` }}>
      {/* Classic Centered Hero */}
      <section className={`relative ${heroPadding} bg-gradient-to-b from-amber-50 to-white`}>
        {customizationData.headerImageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${customizationData.headerImageUrl})` }}
          ></div>
        )}
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto mb-6 sm:mb-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500"></div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-serif font-bold mb-4 sm:mb-6 text-gray-900 leading-tight">
              {customizationData.coachName || "Dr. Sarah Wilson"}
            </h1>
            <div className="w-16 sm:w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-4 sm:mb-6"></div>
            <p className="text-lg sm:text-xl lg:text-2xl mb-8 sm:mb-10 text-gray-700 italic leading-relaxed">
              {customizationData.tagline || "Classical Wisdom for Modern Challenges"}
            </p>
            <Button 
              className="py-3 px-6 sm:py-4 sm:px-10 text-base sm:text-lg min-h-[44px]"
              style={{ backgroundColor: themeColor }}
            >
              {customizationData.buttonText || "Begin Your Journey"}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className={`${sectionPadding} bg-white`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3 lg:gap-12 items-center">
            <div className="lg:col-span-1 order-2 lg:order-1">
              {customizationData.aboutImageUrl ? (
                <img
                  src={customizationData.aboutImageUrl}
                  alt="Philosophy"
                  className="w-full h-32 sm:h-48 lg:h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-32 sm:h-48 lg:h-64 bg-gradient-to-br from-purple-200 to-pink-200 rounded-lg"></div>
              )}
            </div>
            <div className="lg:col-span-2 order-1 lg:order-2 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold mb-4 sm:mb-6 text-gray-900">My Philosophy</h2>
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold mb-3 sm:mb-4 text-gray-900">Services Offered</h2>
            <div className="w-16 sm:w-24 h-1 bg-amber-500 mx-auto"></div>
          </div>
          
          <div className="space-y-8 sm:space-y-12">
            {(customizationData.services || []).map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className={`grid gap-6 lg:gap-8 lg:grid-cols-2 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : 'order-2 lg:order-1'}>
                  {service.imageUrl ? (
                    <img
                      src={service.imageUrl}
                      alt={service.title}
                      className="w-full h-24 sm:h-32 lg:h-48 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-24 sm:h-32 lg:h-48 bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg"></div>
                  )}
                </div>
                <div className={`text-center lg:text-left ${index % 2 === 1 ? 'lg:order-1' : 'order-1 lg:order-2'}`}>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-serif font-semibold mb-3 sm:mb-4 text-gray-900 break-words">{service.title}</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 leading-relaxed break-words">{service.description}</p>
                  <div className="flex items-center justify-center lg:justify-between flex-wrap gap-4">
                    <span className="text-lg sm:text-xl font-semibold" style={{ color: themeColor }}>{service.price}</span>
                    <Button variant="outline" style={{ borderColor: themeColor, color: themeColor }} className="min-h-[44px]">
                      Learn More
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Elegant CTA */}
      <section className={`${sectionPadding} bg-gray-900 text-white`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold mb-4 sm:mb-6">Begin Your Transformation</h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90 italic">Every journey begins with a single step</p>
          <div className="w-16 sm:w-24 h-1 bg-amber-500 mx-auto mb-6 sm:mb-8"></div>
          <Button className="bg-white text-gray-900 hover:bg-gray-100 py-3 px-6 sm:py-4 sm:px-10 text-base sm:text-lg min-h-[44px]">
            {customizationData.buttonText || "Schedule Consultation"}
          </Button>
        </div>
      </section>
    </div>
  );
};
