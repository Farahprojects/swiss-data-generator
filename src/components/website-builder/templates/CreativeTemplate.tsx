
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

export const CreativeTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const themeColor = customizationData.themeColor || '#F59E0B';
  const fontFamily = customizationData.fontFamily || 'Poppins';

  const sectionPadding = isPreview ? 'py-6' : 'py-12 sm:py-16 lg:py-20';
  const heroSection = isPreview ? 'py-8' : 'min-h-screen';

  return (
    <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Creative Asymmetric Hero */}
      <section className={`relative ${heroSection} overflow-hidden`}>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-24 h-24 sm:w-36 sm:h-36 lg:w-72 lg:h-72 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full transform -translate-x-12 -translate-y-12 sm:-translate-x-18 sm:-translate-y-18 lg:-translate-x-32 lg:-translate-y-32 opacity-70"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 sm:w-48 sm:h-48 lg:w-96 lg:h-96 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full transform translate-x-16 translate-y-16 sm:translate-x-24 sm:translate-y-24 lg:translate-x-48 lg:translate-y-48 opacity-60"></div>
          <div className="absolute top-1/2 left-1/2 w-20 h-20 sm:w-32 sm:h-32 lg:w-64 lg:h-64 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-50"></div>
        </div>
        
        {/* Header background image overlay */}
        {customizationData.headerImageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${customizationData.headerImageUrl})` }}
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
                  {customizationData.coachName || "Jamie Rivers"}
                </h1>
                <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-700 leading-relaxed">
                  {customizationData.tagline || "Unleashing Creativity Through Innovative Coaching"}
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                  <Button 
                    className="py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg rounded-full shadow-lg transform hover:scale-105 transition-transform min-h-[44px]"
                    style={{ background: `linear-gradient(135deg, ${themeColor}, #ec4899)` }}
                  >
                    {customizationData.buttonText || "Spark Innovation"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="py-3 px-6 sm:py-4 sm:px-8 text-base sm:text-lg rounded-full border-2 hover:bg-white hover:shadow-lg transition-all min-h-[44px]"
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
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-4 sm:left-10 w-12 h-12 sm:w-16 sm:h-16 lg:w-32 lg:h-32 bg-yellow-300 rounded-full opacity-30 animate-float"></div>
          <div className="absolute bottom-10 right-4 sm:right-10 w-8 h-8 sm:w-12 sm:h-12 lg:w-24 lg:h-24 bg-pink-300 rounded-full opacity-40 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-12 shadow-xl"
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Creative Approach
            </h2>
            
            {customizationData.aboutImageUrl && (
              <div className="mb-6 sm:mb-8 text-center">
                <img
                  src={customizationData.aboutImageUrl}
                  alt="About"
                  className="w-32 h-32 sm:w-48 sm:h-48 object-cover rounded-full mx-auto shadow-xl"
                />
              </div>
            )}
            
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed text-center max-w-3xl mx-auto">
              {customizationData.bio || "I believe that creativity is the key to unlocking human potential. Through innovative techniques, artistic expression, and out-of-the-box thinking, we'll discover new pathways to growth and success."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Dynamic Services Grid */}
      <section className={sectionPadding}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-12 sm:mb-16 bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent">
            Creative Services
          </h2>
          
          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {(customizationData.services || []).map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, rotate: Math.random() * 10 - 5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, rotate: Math.random() * 6 - 3 }}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl transform transition-all hover:shadow-2xl"
              >
                {service.imageUrl ? (
                  <img
                    src={service.imageUrl}
                    alt={service.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl mb-4 sm:mb-6"
                  />
                ) : (
                  <div 
                    className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-2xl mb-4 sm:mb-6 bg-gradient-to-br from-current to-purple-500"
                    style={{ color: themeColor }}
                  ></div>
                )}
                
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900 break-words">{service.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 leading-relaxed break-words">{service.description}</p>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                    {service.price}
                  </span>
                  <Button 
                    variant="ghost" 
                    className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full text-sm sm:text-base"
                  >
                    Explore →
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vibrant CTA */}
      <section className={`${sectionPadding} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-20 h-20 sm:w-32 sm:h-32 lg:w-64 lg:h-64 bg-white rounded-full opacity-10 transform -translate-x-10 -translate-y-10 sm:-translate-x-16 sm:-translate-y-16 lg:-translate-x-32 lg:-translate-y-32"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 sm:w-40 sm:h-40 lg:w-80 lg:h-80 bg-white rounded-full opacity-10 transform translate-x-12 translate-y-12 sm:translate-x-20 sm:translate-y-20 lg:translate-x-40 lg:translate-y-40"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-4 sm:mb-6">Ready to Create Magic?</h2>
            <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90">Let's turn your dreams into colorful reality.</p>
            <Button className="bg-white text-purple-600 hover:bg-gray-100 py-3 px-6 sm:py-4 sm:px-10 text-base sm:text-lg rounded-full shadow-xl transform hover:scale-105 transition-all min-h-[44px]">
              {customizationData.buttonText || "Start Creating"}
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
