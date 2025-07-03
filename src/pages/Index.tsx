
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

  // Redirect authenticated users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
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
        {/* Ultra Minimalist Hero */}
        <section className="relative h-screen w-full flex items-center justify-center bg-white">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="max-w-4xl mx-auto"
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-light text-gray-900 leading-tight mb-12">
                Turn Self-Insight
                <br />
                <span className="italic font-medium">into Relentless Momentum</span>
              </h1>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="mb-16"
              >
                <p className="text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
                  Deep psychological insights that create lasting clarity
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                <Link to="/report">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="px-12 py-6 text-lg font-normal border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-300"
                  >
                    Begin
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* App Features Showcase */}
        <section className="py-24 bg-gradient-to-b from-white to-gray-50/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              className="mx-auto mb-20 max-w-2xl text-center"
            >
              <h2 className="mb-6 text-4xl md:text-5xl font-light text-gray-900 tracking-tight">
                See Therai in Action
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                Experience the complete toolkit that transforms how you understand and guide your clients toward breakthrough moments.
              </p>
            </motion.div>

            <div className="space-y-32">
              {appFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + (i * 0.2), duration: 0.6, ease: "easeOut" }}
                  className={`grid gap-16 items-center lg:grid-cols-2 ${
                    i % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                  }`}
                >
                  {/* Image */}
                  <div className={`relative group ${i % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                    <div className="relative overflow-hidden rounded-2xl">
                      <img 
                        src={getFeatureImage(i)} 
                        alt={feature.title}
                        className="w-full h-[320px] lg:h-[380px] object-cover transition-all duration-500 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`space-y-8 ${i % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                    <div className="space-y-6">
                      <div className="flex items-start gap-5">
                        <div className="rounded-2xl bg-gray-50 border border-gray-200/50 p-4 mt-1">
                          <feature.Icon className="h-6 w-6 text-gray-700" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-3xl lg:text-4xl font-light text-gray-900 leading-tight tracking-tight">{feature.title}</h3>
                          <p className="text-lg text-gray-600 leading-relaxed mt-4">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Link 
                      to="/features" 
                      className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors font-medium text-base group border-b border-gray-300 hover:border-gray-600 pb-1"
                    >
                      <span>Explore Feature</span>
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA - Minimalist & Elegant */}
        <section className="relative py-24 overflow-hidden bg-gradient-to-b from-gray-50/50 to-white">
          {/* Subtle decorative elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-8 w-2 h-2 bg-primary/20 rounded-full"></div>
            <div className="absolute top-1/3 right-12 w-1 h-1 bg-primary/30 rounded-full"></div>
            <div className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-primary/25 rounded-full"></div>
            <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-primary/15 rounded-full"></div>
          </div>
          
          <div className="relative container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.6, ease: "easeOut" }}
              className="max-w-3xl mx-auto"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Ready to transform your practice?
              </h2>
              
              <p className="text-xl text-gray-600 mb-12 leading-relaxed">
                Join professionals creating breakthrough moments with their clients
              </p>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.0, duration: 0.6, ease: "easeOut" }}
              >
                <Link to="/signup">
                  <Button 
                    size="lg" 
                    className="text-lg px-12 py-6 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-primary/20"
                  >
                    Start Now
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
