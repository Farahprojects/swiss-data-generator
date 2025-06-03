
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface WebsiteTemplate {
  id: string;
  name: string;
  template_data: any;
}

interface CustomizationData {
  coachName?: string;
  tagline?: string;
  bio?: string;
  services?: Array<{
    title: string;
    description: string;
    price: string;
  }>;
  buttonText?: string;
  themeColor?: string;
  fontFamily?: string;
  backgroundStyle?: string;
}

interface TemplatePreviewProps {
  template: WebsiteTemplate;
  customizationData: CustomizationData;
  isFullScreen?: boolean;
  onClose?: () => void;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  customizationData,
  isFullScreen = false,
  onClose
}) => {
  const getBackgroundStyle = () => {
    const themeColor = customizationData.themeColor || '#3B82F6';
    
    switch (customizationData.backgroundStyle) {
      case 'gradient':
        return {
          background: `linear-gradient(135deg, ${themeColor}10 0%, ${themeColor}05 100%)`
        };
      case 'pattern':
        return {
          backgroundColor: '#ffffff',
          backgroundImage: `radial-gradient(${themeColor}15 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        };
      default:
        return { backgroundColor: '#ffffff' };
    }
  };

  const renderTemplate = () => {
    const layout = template.template_data?.layout || 'classic';
    const themeColor = customizationData.themeColor || '#3B82F6';
    const fontFamily = customizationData.fontFamily || 'Inter';

    const commonStyles = {
      fontFamily: `${fontFamily}, sans-serif`,
      ...getBackgroundStyle()
    };

    // Hero Section
    const HeroSection = () => (
      <section className="py-20 px-6" style={{ backgroundColor: themeColor }}>
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-5xl font-bold mb-6">
            {customizationData.coachName || 'Your Name'}
          </h1>
          <p className="text-xl mb-8 opacity-90">
            {customizationData.tagline || 'Professional Life Coach'}
          </p>
          <Button 
            className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-3 text-lg"
          >
            {customizationData.buttonText || 'Book a Consultation'}
          </Button>
        </div>
      </section>
    );

    // About Section
    const AboutSection = () => (
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8" style={{ color: themeColor }}>
            About Me
          </h2>
          <div className="text-lg text-gray-700 leading-relaxed text-center max-w-3xl mx-auto">
            {customizationData.bio || 'I help people transform their lives through personalized coaching sessions tailored to their unique goals and challenges.'}
          </div>
        </div>
      </section>
    );

    // Services Section
    const ServicesSection = () => (
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: themeColor }}>
            My Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(customizationData.services || [
              { title: 'Life Coaching', description: '1-on-1 sessions to help you achieve your goals', price: '$150/session' },
              { title: 'Career Coaching', description: 'Navigate your career path with confidence', price: '$120/session' }
            ]).map((service, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold mb-3" style={{ color: themeColor }}>
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {service.description}
                </p>
                {service.price && (
                  <p className="font-semibold text-lg" style={{ color: themeColor }}>
                    {service.price}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>
    );

    // Contact Section
    const ContactSection = () => (
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8" style={{ color: themeColor }}>
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Take the first step towards transforming your life. Book a consultation today.
          </p>
          <Button 
            className="px-8 py-3 text-lg"
            style={{ backgroundColor: themeColor }}
          >
            {customizationData.buttonText || 'Book a Consultation'}
          </Button>
        </div>
      </section>
    );

    return (
      <div style={commonStyles} className="min-h-full">
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <ContactSection />
      </div>
    );
  };

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white w-full h-full max-w-5xl max-h-[90vh] rounded-lg overflow-hidden relative">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="bg-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-full overflow-auto">
            {renderTemplate()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-96 overflow-auto">
        <div className="transform scale-50 origin-top-left" style={{ width: '200%', height: '200%' }}>
          {renderTemplate()}
        </div>
      </div>
    </Card>
  );
};
