
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

export const ProfessionalTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const themeColor = customizationData.themeColor || '#1E40AF';
  const fontFamily = customizationData.fontFamily || 'Inter';

  const sectionPadding = isPreview ? 'py-6' : 'py-20';

  return (
    <div className="bg-white" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Professional Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className={`${isPreview ? 'text-lg' : 'text-2xl'} font-bold`} style={{ color: themeColor }}>
              {customizationData.coachName || "Executive Coach"}
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
              <a href="#services" className="text-gray-600 hover:text-gray-900 transition-colors">Services</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Corporate Hero */}
      <section className={`${sectionPadding} bg-gradient-to-r from-gray-50 to-blue-50`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className={`${isPreview ? 'text-3xl lg:text-4xl' : 'text-5xl lg:text-6xl'} font-bold mb-6 text-gray-900 leading-tight`}>
                {customizationData.coachName || "Michael Thompson"}
              </h1>
              <p className={`${isPreview ? 'text-lg' : 'text-xl lg:text-2xl'} mb-8 text-gray-600 leading-relaxed`}>
                {customizationData.tagline || "Executive Leadership & Business Coaching"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  className={`${isPreview ? 'px-4 py-2 text-base' : 'px-8 py-4 text-lg'}`}
                  style={{ backgroundColor: themeColor }}
                >
                  {customizationData.buttonText || "Schedule Consultation"}
                </Button>
                <Button variant="outline" className={`${isPreview ? 'px-4 py-2 text-base' : 'px-8 py-4 text-lg'} border-gray-300`}>
                  Download Brochure
                </Button>
              </div>
              <div className="flex items-center space-x-8 text-sm text-gray-500">
                <div>✓ 15+ Years Experience</div>
                <div>✓ Fortune 500 Clients</div>
                <div>✓ Proven Results</div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className={`bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg ${isPreview ? 'p-4' : 'p-8'} text-white shadow-2xl`}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className={`${isPreview ? 'text-2xl' : 'text-3xl'} font-bold mb-2`}>500+</div>
                    <div className="text-blue-200">Executives Coached</div>
                  </div>
                  <div className="text-center">
                    <div className={`${isPreview ? 'text-2xl' : 'text-3xl'} font-bold mb-2`}>95%</div>
                    <div className="text-blue-200">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className={`${isPreview ? 'text-2xl' : 'text-3xl'} font-bold mb-2`}>$2M+</div>
                    <div className="text-blue-200">ROI Generated</div>
                  </div>
                  <div className="text-center">
                    <div className={`${isPreview ? 'text-2xl' : 'text-3xl'} font-bold mb-2`}>15+</div>
                    <div className="text-blue-200">Years Experience</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Professional About */}
      <section id="about" className={`${sectionPadding} bg-white`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-2">
              <h2 className={`${isPreview ? 'text-2xl' : 'text-4xl'} font-bold mb-6 text-gray-900`}>Professional Excellence</h2>
              <p className={`${isPreview ? 'text-base' : 'text-lg'} text-gray-600 leading-relaxed mb-6`}>
                {customizationData.bio || "With over 15 years of experience in executive coaching and leadership development, I partner with senior leaders and organizations to drive sustainable performance improvements and strategic growth."}
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className={`${isPreview ? 'w-4 h-4' : 'w-6 h-6'} rounded-full mt-1`} style={{ backgroundColor: themeColor }}></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Strategic Leadership</h4>
                    <p className="text-gray-600">Executive presence and decision-making</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className={`${isPreview ? 'w-4 h-4' : 'w-6 h-6'} rounded-full mt-1`} style={{ backgroundColor: themeColor }}></div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Team Performance</h4>
                    <p className="text-gray-600">Building high-performing teams</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className={`bg-gray-100 rounded-lg ${isPreview ? 'h-32' : 'h-64'} flex items-center justify-center`}>
                <div className="text-center text-gray-500">
                  <div className={`${isPreview ? 'w-10 h-10' : 'w-20 h-20'} mx-auto mb-4 rounded-full`} style={{ backgroundColor: themeColor }}></div>
                  <div>Professional Portrait</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className={`${sectionPadding} bg-gray-50`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className={`${isPreview ? 'text-2xl' : 'text-4xl'} font-bold mb-4 text-gray-900`}>Executive Services</h2>
            <p className={`${isPreview ? 'text-lg' : 'text-xl'} text-gray-600`}>Tailored solutions for leadership excellence</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(customizationData.services || []).map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`bg-white rounded-lg ${isPreview ? 'p-4' : 'p-8'} shadow-sm hover:shadow-lg transition-shadow border`}
              >
                <div className={`${isPreview ? 'w-8 h-8' : 'w-12 h-12'} rounded-lg mb-6 flex items-center justify-center`} style={{ backgroundColor: `${themeColor}15` }}>
                  <div className={`${isPreview ? 'w-4 h-4' : 'w-6 h-6'} rounded`} style={{ backgroundColor: themeColor }}></div>
                </div>
                <h3 className={`${isPreview ? 'text-lg' : 'text-xl'} font-semibold mb-4 text-gray-900`}>{service.title}</h3>
                <p className={`text-gray-600 mb-6 leading-relaxed ${isPreview ? 'text-sm' : ''}`}>{service.description}</p>
                <div className="flex items-center justify-between">
                  <div className={`${isPreview ? 'text-lg' : 'text-2xl'} font-bold`} style={{ color: themeColor }}>{service.price}</div>
                  <Button variant="outline" size="sm">
                    Learn More
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Professional CTA */}
      <section className={sectionPadding} style={{ backgroundColor: themeColor }}>
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className={`${isPreview ? 'text-2xl' : 'text-4xl'} font-bold mb-6`}>Ready to Elevate Your Leadership?</h2>
          <p className={`${isPreview ? 'text-lg' : 'text-xl'} mb-8 opacity-90`}>Let's discuss how we can accelerate your professional growth.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className={`bg-white text-blue-600 hover:bg-gray-100 ${isPreview ? 'px-4 py-2 text-base' : 'px-8 py-4 text-lg'}`}>
              {customizationData.buttonText || "Book Strategy Session"}
            </Button>
            <Button variant="outline" className={`border-white text-white hover:bg-white hover:text-blue-600 ${isPreview ? 'px-4 py-2 text-base' : 'px-8 py-4 text-lg'}`}>
              View Case Studies
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`bg-gray-900 text-white ${isPreview ? 'py-6' : 'py-12'}`}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className={`${isPreview ? 'text-lg' : 'text-2xl'} font-bold mb-4`} style={{ color: themeColor }}>
            {customizationData.coachName || "Executive Coach"}
          </div>
          <p className="text-gray-400">Professional coaching for executive excellence</p>
        </div>
      </footer>
    </div>
  );
};
