
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Star as StarIcon,
  Moon,
  Globe,
  HeartHandshake,
  Clock3,
  CalendarRange,
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
  image: string;
  route: string;
}

const appFeatures: AppFeature[] = [
  {
    title: "Client Management",
    description: "Comprehensive CRM system to track client progress, insights, and breakthrough moments.",
    Icon: Users,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
    route: "/dashboard/clients",
  },
  {
    title: "Report Generation",
    description: "Automated psychological reports with deep insights and momentum tracking.",
    Icon: FileText,
    image: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=800&h=600&fit=crop",
    route: "/dashboard/reports",
  },
  {
    title: "Instant Insights",
    description: "AI-powered analysis that turns journal entries into breakthrough moments.",
    Icon: Zap,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
    route: "/dashboard/insights",
  },
];

const clients = ["AstroApp", "MoonTracker", "ZodiacTech", "StarGuide", "CosmicSoft"];

// Animation helpers --------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

const Index = () => {
  const { user, loading } = useAuth();

  // Redirect authenticated users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UnifiedNavigation />

      <main className="flex-grow overflow-hidden">
        {/* Hero */}
        <section className="relative h-[90vh] w-full overflow-hidden bg-white pt-20">
          <div className="container relative z-10 mx-auto flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mx-auto max-w-4xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-5xl font-bold text-gray-900 md:text-6xl lg:text-7xl mb-2"
              >
                Turn Self-Insight
              </motion.h1>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-5xl font-bold text-transparent md:text-6xl lg:text-7xl mb-6"
              >
                into Relentless Momentum
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8"
              >
                Therai merges deep psychological mapping by analyzing journal entries and overlaying subtle psychological and energetic patterns. Whether you're guiding clients, building teams, or deepening relationships, get clarity that sticks.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-row items-center justify-center gap-4"
            >
              <Button 
                size="lg" 
                className="px-8 py-4 text-lg"
              >
                Free Insight
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white py-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="container mx-auto px-4"
          >
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 md:flex-row md:justify-between">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">95%+</p>
                <p className="text-gray-600">Client breakthrough rate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">15 min</p>
                <p className="text-gray-600">Average session time</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">7 days</p>
                <p className="text-gray-600">To see real momentum</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Client strip */}
        <section className="bg-gray-50 py-10">
          <div className="container mx-auto px-4">
            <p className="mb-6 text-center text-sm font-semibold tracking-wide text-gray-500">
              Trusted by innovators&nbsp;→
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10 opacity-80">
              {clients.map((client, i) => (
                <span key={i} className="text-lg font-medium text-gray-400">
                  {client}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* App Features Showcase */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="mx-auto mb-16 max-w-3xl text-center"
            >
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                See Therai in Action
              </h2>
              <p className="text-lg text-gray-600">
                Experience the complete toolkit that transforms how you understand and guide your clients toward breakthrough moments.
              </p>
            </motion.div>

            <div className="space-y-24">
              {appFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, delay: i * 0.2 }}
                  className={`grid gap-12 items-center lg:grid-cols-2 ${
                    i % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                  }`}
                >
                  {/* Image */}
                  <div className={`relative group ${i % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                    <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                      <img 
                        src={feature.image} 
                        alt={feature.title}
                        className="w-full h-[400px] lg:h-[500px] object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      <div className="absolute top-6 right-6 rounded-full bg-white/95 backdrop-blur-sm p-4 shadow-lg">
                        <feature.Icon className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`space-y-6 ${i % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                    <div className="space-y-4">
                      <h3 className="text-3xl lg:text-4xl font-bold text-gray-900">{feature.title}</h3>
                      <p className="text-lg text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                    
                    <Link 
                      to={feature.route} 
                      className="inline-flex items-center gap-3 text-primary hover:text-primary-hover transition-colors font-semibold text-lg group"
                    >
                      <span>Explore Feature</span>
                      <svg className="h-6 w-6 transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="mt-20 text-center"
            >
              <Link to="/dashboard">
                <Button variant="outline" size="lg">
                  Try the Full Platform
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary py-20 text-white">
          <div className="container mx-auto px-4 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="mb-6 text-3xl font-bold md:text-4xl"
            >
              Ready to transform your practice?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="mx-auto mb-8 max-w-2xl text-xl opacity-90"
            >
              Join thousands of professionals who are already using Therai to create breakthrough moments with their clients.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-gray-100"
              >
                Start Free Trial
              </Button>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  Schedule Demo
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
