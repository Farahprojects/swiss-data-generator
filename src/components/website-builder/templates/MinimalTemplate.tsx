
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

export const MinimalTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const themeColor = customizationData.themeColor || '#10B981';
  const fontFamily = customizationData.fontFamily || 'Inter';

  const sectionPadding = isPreview ? 'py-6' : 'py-32';
  const heroSection = isPreview ? 'py-8' : 'min-h-screen';

  return (
    <div className="bg-white" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Ultra Minimal Hero */}
      <section className={`${heroSection} flex items-center justify-center bg-white`}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <h1 className={`${isPreview ? 'text-2xl lg:text-3xl' : 'text-4xl lg:text-5xl'} font-light mb-8 text-gray-900 tracking-wide`}>
              {customizationData.coachName || "Maria Chen"}
            </h1>
            <div className="w-16 h-px bg-gray-900 mx-auto mb-8"></div>
            <p className={`${isPreview ? 'text-base lg:text-lg' : 'text-lg lg:text-xl'} mb-12 text-gray-600 font-light leading-relaxed`}>
              {customizationData.tagline || "Simplicity in growth. Clarity in purpose."}
            </p>
            <Button 
              variant="outline"
              className={`border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white ${isPreview ? 'px-4 py-2' : 'px-8 py-3'} font-light tracking-wide`}
            >
              {customizationData.buttonText || "Connect"}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Clean About */}
      <section className={`${sectionPadding} bg-gray-50`}>
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={`${isPreview ? 'text-2xl' : 'text-3xl'} font-light mb-12 text-gray-900 text-center`}>About</h2>
            <p className={`${isPreview ? 'text-base' : 'text-lg'} text-gray-600 leading-relaxed text-center font-light`}>
              {customizationData.bio || "I believe in the power of quiet transformation. Through mindful conversations and gentle guidance, we explore pathways to authentic growth."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Minimal Services List */}
      <section className={`${sectionPadding} bg-white`}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className={`${isPreview ? 'text-2xl' : 'text-3xl'} font-light mb-16 text-gray-900 text-center`}>Services</h2>
          <div className="space-y-16">
            {(customizationData.services || []).map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className={`border-b border-gray-100 ${isPreview ? 'pb-6' : 'pb-12'} last:border-b-0`}
              >
                <div className="grid lg:grid-cols-3 gap-8 items-center">
                  <h3 className={`${isPreview ? 'text-lg' : 'text-xl'} font-light text-gray-900`}>{service.title}</h3>
                  <p className={`text-gray-600 font-light lg:col-span-1 ${isPreview ? 'text-sm' : ''}`}>{service.description}</p>
                  <div className="flex items-center justify-between lg:justify-end">
                    <span className={`${isPreview ? 'text-base' : 'text-lg'} font-light text-gray-900`}>{service.price}</span>
                    <Button 
                      variant="ghost" 
                      className="text-gray-600 hover:text-gray-900 font-light p-0 h-auto"
                    >
                      Details →
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimal CTA */}
      <section className={`${sectionPadding} bg-gray-50`}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className={`${isPreview ? 'text-2xl' : 'text-3xl'} font-light mb-8 text-gray-900`}>Let's Begin</h2>
          <p className={`${isPreview ? 'text-base' : 'text-lg'} text-gray-600 font-light mb-12`}>Simple. Focused. Transformative.</p>
          <Button 
            className={`font-light tracking-wide ${isPreview ? 'px-4 py-2' : 'px-8 py-3'}`}
            style={{ backgroundColor: themeColor }}
          >
            {customizationData.buttonText || "Start Conversation"}
          </Button>
        </div>
      </section>
    </div>
  );
};
