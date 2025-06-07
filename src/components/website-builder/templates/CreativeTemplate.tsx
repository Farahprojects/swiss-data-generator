
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

export const CreativeTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const themeColor = customizationData.themeColor || '#F59E0B';
  const fontFamily = customizationData.fontFamily || 'Poppins';

  const sectionPadding = isPreview ? 'py-6' : 'py-20';
  const heroSection = isPreview ? 'py-8' : 'min-h-screen';

  return (
    <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Creative Asymmetric Hero */}
      <section className={`relative ${heroSection} overflow-hidden`}>
        <div className="absolute inset-0">
          <div className={`absolute top-0 left-0 ${isPreview ? 'w-36 h-36' : 'w-72 h-72'} bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full transform -translate-x-32 -translate-y-32 opacity-70`}></div>
          <div className={`absolute bottom-0 right-0 ${isPreview ? 'w-48 h-48' : 'w-96 h-96'} bg-gradient-to-br from-purple-400 to-pink-500 rounded-full transform translate-x-48 translate-y-48 opacity-60`}></div>
          <div className={`absolute top-1/2 left-1/2 ${isPreview ? 'w-32 h-32' : 'w-64 h-64'} bg-gradient-to-br from-blue-400 to-teal-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-50`}></div>
        </div>
        
        <div className={`relative z-10 ${heroSection} flex items-center`}>
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, type: "spring" }}
            >
              <div className={`bg-white/80 backdrop-blur-sm rounded-3xl ${isPreview ? 'p-4' : 'p-8'} shadow-2xl`}>
                <h1 className={`${isPreview ? 'text-3xl lg:text-4xl' : 'text-5xl lg:text-6xl'} font-bold mb-6 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent leading-tight`}>
                  {customizationData.coachName || "Jamie Rivers"}
                </h1>
                <p className={`${isPreview ? 'text-lg' : 'text-xl'} mb-8 text-gray-700 leading-relaxed`}>
                  {customizationData.tagline || "Unleashing Creativity Through Innovative Coaching"}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    className={`${isPreview ? 'px-4 py-2 text-base' : 'px-8 py-4 text-lg'} rounded-full shadow-lg transform hover:scale-105 transition-transform`}
                    style={{ background: `linear-gradient(135deg, ${themeColor}, #ec4899)` }}
                  >
                    {customizationData.buttonText || "Spark Innovation"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`${isPreview ? 'px-4 py-2 text-base' : 'px-8 py-4 text-lg'} rounded-full border-2 hover:bg-white hover:shadow-lg transition-all`}
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
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className={`${isPreview ? 'h-16' : 'h-32'} bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl transform rotate-3`}></div>
                  <div className={`${isPreview ? 'h-24' : 'h-48'} bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl transform -rotate-2`}></div>
                </div>
                <div className={`space-y-4 ${isPreview ? 'mt-4' : 'mt-8'}`}>
                  <div className={`${isPreview ? 'h-20' : 'h-40'} bg-gradient-to-br from-blue-400 to-teal-500 rounded-2xl transform rotate-1`}></div>
                  <div className={`${isPreview ? 'h-18' : 'h-36'} bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl transform -rotate-3`}></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Creative About with Floating Elements */}
      <section className={`${sectionPadding} relative`}>
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute top-10 left-10 ${isPreview ? 'w-16 h-16' : 'w-32 h-32'} bg-yellow-300 rounded-full opacity-30 animate-float`}></div>
          <div className={`absolute bottom-10 right-10 ${isPreview ? 'w-12 h-12' : 'w-24 h-24'} bg-pink-300 rounded-full opacity-40 animate-float`} style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className={`bg-white/80 backdrop-blur-sm rounded-3xl ${isPreview ? 'p-6' : 'p-12'} shadow-xl`}
          >
            <h2 className={`${isPreview ? 'text-2xl' : 'text-4xl'} font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent`}>
              Creative Approach
            </h2>
            <p className={`${isPreview ? 'text-base' : 'text-lg'} text-gray-700 leading-relaxed text-center max-w-3xl mx-auto`}>
              {customizationData.bio || "I believe that creativity is the key to unlocking human potential. Through innovative techniques, artistic expression, and out-of-the-box thinking, we'll discover new pathways to growth and success."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Dynamic Services Grid */}
      <section className={sectionPadding}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className={`${isPreview ? 'text-2xl' : 'text-4xl'} font-bold text-center mb-16 bg-gradient-to-r from-orange-500 to-purple-500 bg-clip-text text-transparent`}>
            Creative Services
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(customizationData.services || []).map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, rotate: Math.random() * 10 - 5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, rotate: Math.random() * 6 - 3 }}
                className={`bg-white/80 backdrop-blur-sm rounded-3xl ${isPreview ? 'p-4' : 'p-8'} shadow-xl transform transition-all hover:shadow-2xl`}
              >
                <div 
                  className={`${isPreview ? 'w-8 h-8' : 'w-16 h-16'} rounded-2xl mb-6 bg-gradient-to-br from-current to-purple-500`}
                  style={{ color: themeColor }}
                ></div>
                <h3 className={`${isPreview ? 'text-lg' : 'text-xl'} font-bold mb-4 text-gray-900`}>{service.title}</h3>
                <p className={`text-gray-600 mb-6 leading-relaxed ${isPreview ? 'text-sm' : ''}`}>{service.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`${isPreview ? 'text-lg' : 'text-2xl'} font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent`}>
                    {service.price}
                  </span>
                  <Button 
                    variant="ghost" 
                    className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-full"
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
          <div className={`absolute top-0 left-0 ${isPreview ? 'w-32 h-32' : 'w-64 h-64'} bg-white rounded-full opacity-10 transform -translate-x-32 -translate-y-32`}></div>
          <div className={`absolute bottom-0 right-0 ${isPreview ? 'w-40 h-40' : 'w-80 h-80'} bg-white rounded-full opacity-10 transform translate-x-40 translate-y-40`}></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={`${isPreview ? 'text-3xl' : 'text-5xl'} font-bold mb-6`}>Ready to Create Magic?</h2>
            <p className={`${isPreview ? 'text-lg' : 'text-xl'} mb-8 opacity-90`}>Let's turn your dreams into colorful reality.</p>
            <Button className={`bg-white text-purple-600 hover:bg-gray-100 ${isPreview ? 'px-6 py-2 text-base' : 'px-10 py-4 text-lg'} rounded-full shadow-xl transform hover:scale-105 transition-all`}>
              {customizationData.buttonText || "Start Creating"}
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};
