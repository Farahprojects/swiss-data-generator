
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { handleServicePurchase, hasValidPrice } from "@/utils/servicePurchase";
import { Clock, Users, Target, TrendingUp, Shield, Calendar } from "lucide-react";

interface TemplateProps {
  customizationData: any;
  isPreview?: boolean;
}

export const ProfessionalTemplate = ({ customizationData, isPreview = false }: TemplateProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [purchasingService, setPurchasingService] = useState<number | null>(null);
  
  const themeColor = customizationData.themeColor || '#1E3A8A';
  const fontFamily = customizationData.fontFamily || 'Inter';

  // Helper function to get button styles
  const getButtonStyles = () => {
    const buttonColor = customizationData.buttonColor || themeColor;
    const buttonTextColor = customizationData.buttonTextColor || '#FFFFFF';
    const buttonFontFamily = customizationData.buttonFontFamily || fontFamily;
    const buttonStyle = customizationData.buttonStyle || 'bordered';
    
    return {
      backgroundColor: buttonStyle === 'bordered' ? 'transparent' : buttonColor,
      color: buttonTextColor,
      fontFamily: `${buttonFontFamily}, sans-serif`,
      border: buttonStyle === 'borderless' ? 'none' : `2px solid ${buttonColor}`,
      borderRadius: buttonStyle === 'borderless' ? '0' : undefined
    };
  };

  const sectionPadding = isPreview ? 'py-6' : 'py-12 sm:py-16 lg:py-20';

  // Check if header image exists
  const hasHeaderImage = customizationData.headerImageData?.url || customizationData.headerImageUrl;

  // Create report service card
  const reportService = !isPreview ? {
    title: "Strategic Timing Analysis",
    description: "Comprehensive astrological insights for executive decision-making and optimal timing in business ventures.",
    price: "$29",
    isReportService: true
  } : null;

  // Add report service as first item if not in preview
  const allServices = reportService ? [reportService, ...(customizationData.services || [])] : (customizationData.services || []);

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

  const reportTypes = [
    {
      icon: <Target className="h-6 w-6" />,
      title: "Mindset Analysis",
      description: "Deep psychological insights for leadership development"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Compatibility Reports",
      description: "Team dynamics and partnership compatibility analysis"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Timing Intelligence",
      description: "Optimal timing for major decisions and launches"
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Career Transitions",
      description: "Strategic guidance for professional pivots"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Solar Return Analysis",
      description: "Annual strategic planning and goal setting"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Essence Profiling",
      description: "Core personality strengths and leadership style"
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen" style={{ fontFamily: `${fontFamily}, sans-serif` }}>
      {/* Professional Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl sm:text-2xl font-bold text-slate-900" style={{ color: themeColor }}>
              {customizationData.coachName || "Strategic Advisor"}
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#services" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Services</a>
              <a href="#methodology" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Methodology</a>
              <a href="#contact" className="text-slate-600 hover:text-slate-900 transition-colors font-medium">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Executive Hero */}
      <section className={`${sectionPadding} ${!hasHeaderImage ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'relative'}`}>
        {hasHeaderImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${customizationData.headerImageData?.url || customizationData.headerImageUrl})` }}
          >
            <div className="absolute inset-0 bg-slate-900/70"></div>
          </div>
        )}
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
                Strategic Timing<br />
                <span style={{ color: themeColor === '#1E3A8A' ? '#60A5FA' : themeColor }}>Intelligence</span>
              </h1>
              <p className="text-xl lg:text-2xl mb-8 leading-relaxed text-slate-300">
                {customizationData.tagline || "Astrological insights for executive decision-making and optimal business timing"}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center lg:justify-start">
                <Button 
                  className="py-4 px-8 text-lg font-semibold"
                  style={getButtonStyles()}
                >
                  {customizationData.buttonText || "Get Strategic Analysis"}
                </Button>
                <Button 
                  variant="outline" 
                  className="py-4 px-8 text-lg font-semibold border-white text-white hover:bg-white hover:text-slate-900"
                >
                  View Sample Report
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-8 text-sm text-slate-400 justify-center lg:justify-start">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Confidential Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>24-48 Hour Delivery</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white rounded-xl p-8 shadow-2xl border border-slate-200">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2 text-slate-900">6</div>
                    <div className="text-slate-600 text-sm">Specialized Reports</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2 text-slate-900">24h</div>
                    <div className="text-slate-600 text-sm">Delivery Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2 text-slate-900">100%</div>
                    <div className="text-slate-600 text-sm">Personalized</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-2 text-slate-900">±1min</div>
                    <div className="text-slate-600 text-sm">Birth Time Precision</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Report Types Grid */}
      <section className={`${sectionPadding} bg-white`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-slate-900">
              Strategic Analysis Services
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Comprehensive astrological insights designed for executive decision-making and strategic planning
            </p>
          </div>
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {reportTypes.map((report, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-slate-50 rounded-lg p-6 hover:shadow-lg transition-all duration-300 border border-slate-200 hover:border-slate-300"
              >
                <div 
                  className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center text-white"
                  style={{ backgroundColor: themeColor }}
                >
                  {report.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-slate-900">{report.title}</h3>
                <p className="text-slate-600 leading-relaxed">{report.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="methodology" className={`${sectionPadding} bg-slate-100`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              {(customizationData.aboutImageData?.url || customizationData.aboutImageUrl) ? (
                <img
                  src={customizationData.aboutImageData?.url || customizationData.aboutImageUrl}
                  alt="Professional"
                  className="w-full h-64 lg:h-80 object-cover rounded-lg shadow-lg"
                />
              ) : (
                <div className="bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg h-64 lg:h-80 flex items-center justify-center">
                  <div className="text-center text-slate-600">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-400"></div>
                    <div>Strategic Advisor Portrait</div>
                  </div>
                </div>
              )}
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-slate-900">
                {customizationData.introTitle || "Precision-Based Methodology"}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                {customizationData.bio || "Our strategic timing analysis combines traditional astrological wisdom with modern executive needs. Each report is meticulously crafted using precise birth data to provide actionable insights for leadership decisions, optimal timing, and strategic planning."}
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: themeColor }}></div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Birth Chart Precision</h4>
                    <p className="text-slate-600">Exact birth time analysis for accurate planetary positioning</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: themeColor }}></div>
                  <div>
                    <h4 className="font-semibold text-slate-900">Executive Context</h4>
                    <p className="text-slate-600">Insights tailored for leadership and business applications</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className={`${sectionPadding} bg-white`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-slate-900">
              {customizationData.servicesTitle || "Professional Services"}
            </h2>
            <p className="text-xl text-slate-600">Strategic guidance and personalized analysis</p>
          </div>
          
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {allServices.map((service: any, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-lg p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-200"
              >
                <h3 className="text-xl font-semibold mb-4 text-slate-900">{service.title}</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">{service.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold" style={{ color: themeColor }}>{service.price}</div>
                  {service.isReportService ? (
                    <Button 
                      onClick={() => handlePurchaseClick(service, index)}
                      style={{ backgroundColor: themeColor, color: 'white' }}
                      className="hover:opacity-90"
                    >
                      Get Analysis
                    </Button>
                  ) : hasValidPrice(service.price) ? (
                    <Button 
                      onClick={() => handlePurchaseClick(service, index)}
                      disabled={purchasingService === index}
                      style={{ backgroundColor: themeColor, color: 'white' }}
                      className="hover:opacity-90"
                    >
                      {purchasingService === index ? "Processing..." : "Purchase"}
                    </Button>
                  ) : (
                    <Button variant="outline" className="border-slate-300">
                      Learn More
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={sectionPadding} style={{ backgroundColor: themeColor }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-white">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            {customizationData.footerHeading || "Ready for Strategic Clarity?"}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {customizationData.footerSubheading || "Get personalized timing insights for your most important decisions."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="py-4 px-8 text-lg font-semibold"
              style={getButtonStyles()}
            >
              {customizationData.buttonText || "Start Analysis"}
            </Button>
            <Button variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900 py-4 px-8 text-lg font-semibold">
              View Methodology
            </Button>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center">
            <div className="text-2xl font-bold mb-4" style={{ color: themeColor }}>
              {customizationData.coachName || "Strategic Advisor"}
            </div>
            <p className="text-slate-400 mb-6">Strategic timing intelligence for executive decisions</p>
            <div className="flex justify-center space-x-8 text-sm text-slate-500">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
