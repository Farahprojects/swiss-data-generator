
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  Zap,
  CheckCircle,
  ArrowRight,
  UserPlus,
  MessageSquare,
  BarChart3,
  CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLandingPageImages } from "@/hooks/useLandingPageImages";

const Features = () => {
  const { user } = useAuth();
  const { data: imageConfig } = useLandingPageImages();

  // Get image for feature by index, with fallback to default
  const getFeatureImage = (index: number): string => {
    return imageConfig?.feature_images?.[index.toString()] || 
           `https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop`;
  };

  const workflowSteps = [
    {
      step: "01",
      title: "Easy Sign Up",
      description: "Get started in seconds with our simple registration process. No complex setup required.",
      icon: UserPlus,
      features: ["Instant account creation", "No credit card required", "Quick onboarding"],
    },
    {
      step: "02", 
      title: "Client Management",
      description: "Add and organize your clients with comprehensive profiles and progress tracking.",
      icon: Users,
      features: ["Client profiles & notes", "Progress tracking", "Session history"],
      free: true,
    },
    {
      step: "03",
      title: "Journal Entries",
      description: "Clients can write journal entries or you can add notes from your sessions.",
      icon: MessageSquare,
      features: ["Rich text editing", "Voice-to-text", "Session notes"],
      free: true,
    },
    {
      step: "04",
      title: "AI Insights & Reports",
      description: "Transform journal entries into breakthrough insights and comprehensive reports.",
      icon: Zap,
      features: ["AI-powered analysis", "Breakthrough detection", "Professional reports"],
      premium: true,
    },
  ];

  const appFeatures = [
    {
      title: "Client Management",
      description: "Comprehensive CRM system to track client progress, insights, and breakthrough moments.",
      icon: Users,
      image: getFeatureImage(0),
      free: true,
    },
    {
      title: "Report Generation",
      description: "Automated psychological reports with deep insights and momentum tracking.",
      icon: FileText,
      image: getFeatureImage(1),
      premium: true,
    },
    {
      title: "Instant Insights",
      description: "AI-powered analysis that turns journal entries into breakthrough moments.",
      icon: Zap,
      image: getFeatureImage(2),
      premium: true,
    },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
    }),
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UnifiedNavigation />

      <main className="flex-grow overflow-hidden">
        {/* Hero Section */}
        <section className="relative py-20 pt-32">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto"
            >
              <h1 className="text-5xl font-bold text-gray-900 md:text-6xl mb-6">
                How Therai Works
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
                From initial setup to breakthrough insights - discover the complete journey of transforming client understanding with Therai.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Workflow Steps */}
        <section className="py-20 bg-gray-50/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold md:text-4xl mb-4">
                Your Journey to Better Client Understanding
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Follow these simple steps to unlock deeper insights and create breakthrough moments with your clients.
              </p>
            </motion.div>

            <div className="grid gap-8 md:gap-12 lg:gap-16">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  className={`grid items-center gap-8 lg:grid-cols-2 ${
                    index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                  }`}
                >
                  {/* Content */}
                  <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-sm font-semibold text-primary/70">
                        STEP {step.step}
                      </div>
                      {step.free && (
                        <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          FREE
                        </div>
                      )}
                      {step.premium && (
                        <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                          PREMIUM
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-3xl lg:text-4xl font-bold text-gray-900">
                      {step.title}
                    </h3>
                    
                    <p className="text-lg text-gray-600 leading-relaxed">
                      {step.description}
                    </p>

                    <ul className="space-y-3">
                      {step.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {index < workflowSteps.length - 1 && (
                      <div className="flex items-center gap-3 text-primary font-medium pt-4">
                        <span>Next Step</span>
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Visual */}
                  <div className={`relative ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                    <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-br from-primary/5 to-primary/10 p-8 h-80">
                      <div className="flex items-center justify-center h-full">
                        <step.icon className="h-24 w-24 text-primary/30" />
                      </div>
                      <div className="absolute top-4 right-4 text-6xl font-bold text-primary/10">
                        {step.step}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Information */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold md:text-4xl mb-4">
                What's Free vs. Premium
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Start for free with essential client management tools. Upgrade for AI-powered insights and reports.
              </p>
            </motion.div>

            <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
              {/* Free Features */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="bg-white border-2 border-gray-200 rounded-2xl p-8"
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Forever</h3>
                  <p className="text-gray-600">Essential client management tools</p>
                </div>
                
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Unlimited client profiles</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Session notes & tracking</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Basic journal entries</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Progress monitoring</span>
                  </li>
                </ul>
              </motion.div>

              {/* Premium Features */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-8 relative"
              >
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                    Premium
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Insights</h3>
                  <p className="text-gray-600">Everything in Free, plus:</p>
                </div>
                
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <span>AI breakthrough detection</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>Professional report generation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span>Pay per insight generated</span>
                  </li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature Showcase */}
        <section className="py-20 bg-gray-50/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl font-bold md:text-4xl mb-4">
                Explore Our Features
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Experience the complete toolkit that transforms how you understand and guide your clients.
              </p>
            </motion.div>

            <div className="grid gap-12 lg:gap-16">
              {appFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  className={`grid gap-8 items-center lg:grid-cols-2 ${
                    index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                  }`}
                >
                  {/* Image */}
                  <div className={`relative group ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                    <div className="relative overflow-hidden rounded-2xl shadow-xl">
                      <img 
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-[280px] lg:h-[320px] object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`space-y-6 ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <feature.icon className="h-8 w-8 text-primary" />
                      </div>
                      {feature.free && (
                        <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                          FREE
                        </div>
                      )}
                      {feature.premium && (
                        <div className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                          PREMIUM
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-3xl lg:text-4xl font-bold text-gray-900">
                      {feature.title}
                    </h3>
                    
                    <p className="text-lg text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl mx-auto"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Ready to Get Started?
              </h2>
              
              <p className="text-xl text-gray-600 mb-12">
                Join professionals creating breakthrough moments with their clients
              </p>
              
              <Link to={user ? "/dashboard" : "/login"}>
                <Button 
                  size="lg" 
                  className="text-lg px-12 py-6 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {user ? "Go to Dashboard" : "Start for Free"}
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

export default Features;
