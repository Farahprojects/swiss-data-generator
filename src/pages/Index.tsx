
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  MessageSquare,
  BarChart3,
  FileText,
  Palette,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLandingPageImages } from "@/hooks/useLandingPageImages";

/**
 * Landing / Index page – 2025‑04‑26 refresh
 * ------------------------------------------------------------------
 * ✦  Animated hero with clean background
 * ✦  Lucide icons (no more random emojis)
 * ✦  Framer‑motion fade‑ups for sections
 * ✦  Updated stats & logo strip for Therai
 */

interface AppFeature {
  title: string;
  description: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const appFeatures: AppFeature[] = [
  {
    title: "Client Management",
    description: "Comprehensive CRM system to track client progress, insights, and breakthrough moments.",
    Icon: Users,
  },
  {
    title: "Report Generation",
    description: "Automated psychological reports with deep insights and momentum tracking.",
    Icon: FileText,
  },
  {
    title: "Instant Insights",
    description: "AI-powered analysis that turns journal entries into breakthrough moments.",
    Icon: Zap,
  },
];

// Animation helpers --------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

const Index = () => {
  const { user, loading } = useAuth();
  const { data: imageConfig } = useLandingPageImages();

  // Redirect authenticated users to calendar
  if (!loading && user) {
    return <Navigate to="/calendar" replace />;
  }

  // Get image for feature by index, with fallback to default
  const getFeatureImage = (index: number): string => {
    return imageConfig?.feature_images?.[index.toString()] || 
           `https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UnifiedNavigation />

      <main className="flex-grow overflow-hidden">
        {/* Modern Hero Section */}
        <section className="relative h-screen w-full flex items-center justify-center bg-white overflow-hidden">
          {/* Subtle animated background */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-8 w-2 h-2 bg-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 right-12 w-1 h-1 bg-primary/30 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-primary/25 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-primary/15 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
          </div>

          <div className="relative z-10 w-full md:px-4 md:container md:mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="max-w-5xl mx-auto space-y-12"
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-gray-900 leading-tight">
                Turn Self-Insight
                <br />
                <span className="italic font-medium">into Relentless Momentum</span>
              </h1>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="mb-16"
              >
                <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                  Deep psychological insights that create lasting clarity
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.0, duration: 0.6 }}
                className="space-y-8"
              >
                <Link to="/signup">
                  <Button 
                    size="lg" 
                    className="bg-primary text-white px-12 py-6 rounded-xl text-lg font-medium hover:bg-primary-hover transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Begin Your Journey
                  </Button>
                </Link>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.4, duration: 0.6 }}
                  className="flex justify-center items-center gap-8 text-sm text-gray-500 font-medium"
                >
                  <div className="flex items-center gap-2 group">
                    <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span>AI-Powered</span>
                  </div>
                  <div className="flex items-center gap-2 group">
                    <Users className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span>For Professionals</span>
                  </div>
                  <div className="flex items-center gap-2 group">
                    <BarChart3 className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span>Data-Driven</span>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Elegant Features Showcase */}
        <section className="py-32 bg-gradient-to-b from-white to-gray-50/30">
          <div className="w-full md:px-4 md:container md:mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-24 space-y-8"
            >
              <h2 className="text-5xl md:text-6xl font-light text-gray-900 leading-tight">
                The <span className="italic font-medium">complete</span> toolkit
              </h2>
              <p className="text-xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
                Everything you need to transform insights into breakthrough moments for your clients
              </p>
            </motion.div>

            <div className="grid gap-12 lg:grid-cols-3 max-w-7xl mx-auto">
              {appFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="group bg-white rounded-3xl p-8 border border-gray-100 hover:border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-2"
                >
                  <div className="space-y-8">
                    <div className="relative">
                      <img 
                        src={getFeatureImage(i)} 
                        alt={feature.title}
                        className="w-full h-48 object-cover rounded-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent rounded-2xl" />
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="rounded-2xl bg-gray-50 border border-gray-200/50 p-3">
                          <feature.Icon className="h-6 w-6 text-gray-700" />
                        </div>
                        <h3 className="text-2xl font-light text-gray-900">{feature.title}</h3>
                      </div>
                      
                      <p className="text-lg text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    
                    <Link 
                      to="/features" 
                      className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors font-medium group/link"
                    >
                      <span>Learn more</span>
                      <svg className="h-4 w-4 transition-transform group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Modern CTA Section */}
        <section className="py-32 bg-white relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-8 w-2 h-2 bg-primary/10 rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 right-12 w-1 h-1 bg-primary/20 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-primary/15 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-primary/10 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
          </div>
          
          <div className="relative w-full md:px-4 md:container md:mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <h2 className="text-5xl md:text-6xl font-light leading-tight text-gray-900">
                Ready to <span className="italic font-medium">transform</span> your practice?
              </h2>
              
              <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto leading-relaxed">
                Join professionals creating breakthrough moments with their clients every day
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link to="/signup">
                  <Button 
                    size="lg" 
                    className="bg-gray-900 text-white hover:bg-gray-800 px-12 py-6 rounded-xl text-lg font-light transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    Start for Free
                  </Button>
                </Link>
                
                <Link to="/features">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="border-gray-200 text-gray-900 hover:bg-gray-50 px-12 py-6 rounded-xl text-lg font-light transition-all duration-300"
                  >
                    Explore Features
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
