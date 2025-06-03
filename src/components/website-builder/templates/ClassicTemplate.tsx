
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TemplateProps {
  customizationData: any;
}

export const ClassicTemplate = ({ customizationData }: TemplateProps) => {
  const themeColor = customizationData.themeColor || '#8B5CF6';
  const fontFamily = customizationData.fontFamily || 'Playfair Display';

  return (
    <div className="min-h-screen bg-cream-50" style={{ fontFamily: `${fontFamily}, serif` }}>
      {/* Classic Centered Hero */}
      <section className="relative py-32 bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500"></div>
            <h1 className="text-5xl lg:text-6xl font-serif font-bold mb-6 text-gray-900 leading-tight">
              {customizationData.coachName || "Dr. Sarah Wilson"}
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto mb-6"></div>
            <p className="text-xl lg:text-2xl mb-10 text-gray-700 italic">
              {customizationData.tagline || "Classical Wisdom for Modern Challenges"}
            </p>
            <Button 
              className="px-10 py-4 text-lg"
              style={{ backgroundColor: themeColor }}
            >
              {customizationData.buttonText || "Begin Your Journey"}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-1">
              <div className="w-full h-64 bg-gradient-to-br from-purple-200 to-pink-200 rounded-lg"></div>
            </div>
            <div className="lg:col-span-2">
              <h2 className="text-4xl font-serif font-bold mb-6 text-gray-900">My Philosophy</h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                {customizationData.bio || "Drawing from time-tested principles and classical approaches, I believe in the power of deep reflection, meaningful dialogue, and gradual transformation."}
              </p>
              <div className="flex items-center text-amber-600">
                <div className="w-8 h-0.5 bg-amber-600 mr-4"></div>
                <span className="italic">Wisdom through experience</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services with Classic Layout */}
      <section className="py-20 bg-amber-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold mb-4 text-gray-900">Services Offered</h2>
            <div className="w-24 h-1 bg-amber-500 mx-auto"></div>
          </div>
          
          <div className="space-y-12">
            {(customizationData.services || []).map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className={`grid lg:grid-cols-2 gap-8 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="w-full h-48 bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg"></div>
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <h3 className="text-2xl font-serif font-semibold mb-4 text-gray-900">{service.title}</h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-semibold" style={{ color: themeColor }}>{service.price}</span>
                    <Button variant="outline" style={{ borderColor: themeColor, color: themeColor }}>
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
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-serif font-bold mb-6">Begin Your Transformation</h2>
          <p className="text-xl mb-8 opacity-90 italic">Every journey begins with a single step</p>
          <div className="w-24 h-1 bg-amber-500 mx-auto mb-8"></div>
          <Button className="bg-white text-gray-900 hover:bg-gray-100 px-10 py-4 text-lg">
            {customizationData.buttonText || "Schedule Consultation"}
          </Button>
        </div>
      </section>
    </div>
  );
};
