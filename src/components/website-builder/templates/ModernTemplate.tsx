
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

export const ModernTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const themeColor = customizationData.themeColor || '#6366F1';
  const fontFamily = customizationData.fontFamily || 'Inter';

  // Use compact spacing for preview
  const sectionPadding = isPreview ? 'py-6' : 'py-20';
  const heroSection = isPreview ? 'py-8' : 'min-h-screen';

  return (
    <div className="bg-gray-50" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Modern Hero with Split Layout */}
      <section className={`relative ${heroSection} flex items-center`}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-blue-600 opacity-20"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-white"
          >
            <h1 className={`${isPreview ? 'text-3xl lg:text-4xl' : 'text-6xl lg:text-7xl'} font-bold mb-6 leading-tight`}>
              {customizationData.coachName || "Alex Johnson"}
            </h1>
            <p className={`${isPreview ? 'text-lg' : 'text-xl lg:text-2xl'} mb-8 text-gray-300 leading-relaxed`}>
              {customizationData.tagline || "Transforming Lives Through Modern Coaching"}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className={`${isPreview ? 'px-4 py-2 text-base' : 'px-8 py-4 text-lg'} rounded-full`}
                style={{ backgroundColor: themeColor }}
              >
                {customizationData.buttonText || "Start Your Journey"}
              </Button>
              <Button variant="outline" className={`${isPreview ? 'px-4 py-2 text-base' : 'px-8 py-4 text-lg'} rounded-full border-white text-white hover:bg-white hover:text-gray-900`}>
                Learn More
              </Button>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className={`w-full ${isPreview ? 'h-48' : 'h-96'} bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl shadow-2xl`}></div>
            <div className={`absolute -bottom-6 -left-6 ${isPreview ? 'w-16 h-16' : 'w-32 h-32'} bg-yellow-400 rounded-full opacity-80`}></div>
            <div className={`absolute -top-6 -right-6 ${isPreview ? 'w-12 h-12' : 'w-24 h-24'} bg-pink-400 rounded-full opacity-60`}></div>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className={`${sectionPadding} bg-white`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className={`${isPreview ? 'text-2xl' : 'text-4xl'} font-bold mb-8 text-gray-900`}>About Me</h2>
          <p className={`${isPreview ? 'text-base' : 'text-lg'} text-gray-600 leading-relaxed`}>
            {customizationData.bio || "I'm passionate about helping individuals unlock their full potential through personalized coaching approaches that blend modern techniques with timeless wisdom."}
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className={`${sectionPadding} bg-gray-50`}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className={`${isPreview ? 'text-2xl' : 'text-4xl'} font-bold text-center mb-16 text-gray-900`}>Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(customizationData.services || []).map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`bg-white rounded-xl ${isPreview ? 'p-4' : 'p-8'} shadow-lg hover:shadow-xl transition-shadow`}
              >
                <div className={`${isPreview ? 'w-8 h-8' : 'w-12 h-12'} rounded-lg mb-6`} style={{ backgroundColor: themeColor }}></div>
                <h3 className={`${isPreview ? 'text-lg' : 'text-xl'} font-semibold mb-4 text-gray-900`}>{service.title}</h3>
                <p className={`text-gray-600 mb-6 ${isPreview ? 'text-sm' : ''}`}>{service.description}</p>
                <div className={`${isPreview ? 'text-lg' : 'text-2xl'} font-bold`} style={{ color: themeColor }}>{service.price}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={sectionPadding} style={{ backgroundColor: themeColor }}>
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className={`${isPreview ? 'text-2xl' : 'text-4xl'} font-bold mb-6`}>Ready to Transform Your Life?</h2>
          <p className={`${isPreview ? 'text-lg' : 'text-xl'} mb-8 opacity-90`}>Take the first step towards achieving your goals.</p>
          <Button className={`bg-white text-gray-900 hover:bg-gray-100 ${isPreview ? 'px-4 py-2 text-base' : 'px-8 py-4 text-lg'} rounded-full`}>
            {customizationData.buttonText || "Book Consultation"}
          </Button>
        </div>
      </section>
    </div>
  );
};
