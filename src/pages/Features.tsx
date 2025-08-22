
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
  const { data: config } = useLandingPageImages();

  console.log("Features page is loading...");

  const workflowSteps = [
    {
      step: "01",
      title: "Easy Sign Up",
      description: "Get started in seconds with our simple registration process. No complex setup required.",
      icon: UserPlus,
      features: ["Instant account creation", "No credit card required", "Quick onboarding"],
      imageUrl: config?.features_images?.["0"] || null,
    },
    {
      step: "02", 
      title: "Client Management",
      description: "Add and organize your clients with comprehensive profiles and progress tracking.",
      icon: Users,
      features: ["Client profiles & notes", "Progress tracking", "Session history"],
      free: true,
      imageUrl: config?.features_images?.["1"] || "https://auth.theraiastro.com/storage/v1/object/public/feature-images/Imagine2/Screenshot%202025-06-10%20at%206.57.31%20PM.png",
    },
    {
      step: "03",
      title: "Journal Entries",
      description: "Clients can write journal entries or you can add notes from your sessions.",
      icon: MessageSquare,
      features: ["Rich text editing", "Voice-to-text", "Session notes"],
      free: true,
      imageUrl: config?.features_images?.["2"] || null,
    },
    {
      step: "04",
      title: "AI Insights & Reports",
      description: "Transform journal entries into breakthrough insights and comprehensive reports.",
      icon: Zap,
      features: ["AI-powered analysis", "Breakthrough detection", "Professional reports"],
      premium: true,
      imageUrl: config?.features_images?.["3"] || null,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UnifiedNavigation />

      <main className="flex-grow overflow-hidden">
        {/* Hero Section */}
        <section className="relative py-32 pt-40">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-5xl mx-auto space-y-12"
            >
              <h1 className="text-6xl md:text-7xl font-light text-gray-900 leading-tight">
                How <span className="italic font-medium">Therai</span> transforms your practice
              </h1>
              <p className="text-2xl text-gray-600 font-light leading-relaxed max-w-4xl mx-auto">
                A simple, elegant workflow that turns everyday client interactions into profound insights and breakthrough moments.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Workflow Steps */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-24 space-y-8"
            >
              <h2 className="text-5xl md:text-6xl font-light text-gray-900 leading-tight">
                Your <span className="italic font-medium">journey</span> to deeper understanding
              </h2>
              <p className="text-xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
                Four elegant steps that transform everyday conversations into profound insights and lasting breakthroughs.
              </p>
            </motion.div>

            <div className="space-y-32">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className={`grid items-center gap-16 lg:grid-cols-2 ${
                    index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                  }`}
                >
                  {/* Content */}
                  <div className={`space-y-8 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                    <div className="flex items-center gap-6">
                      <div className="text-sm font-light text-gray-500 tracking-widest uppercase">
                        Step {step.step}
                      </div>
                      {step.free && (
                        <div className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-light rounded-xl">
                          Always Free
                        </div>
                      )}
                      {step.premium && (
                        <div className="px-4 py-2 bg-gray-900 text-white text-sm font-light rounded-xl">
                          Premium
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-4xl lg:text-5xl font-light text-gray-900 leading-tight">
                      {step.title}
                    </h3>
                    
                    <p className="text-xl text-gray-600 font-light leading-relaxed">
                      {step.description}
                    </p>

                    <div className="space-y-4 pt-4">
                      {step.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-3 flex-shrink-0"></div>
                          <span className="text-lg text-gray-700 font-light">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visual */}
                  <div className={`relative ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                    {step.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={step.imageUrl} 
                          alt={step.title}
                          className="w-full h-96 object-cover rounded-3xl"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl"></div>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-3xl bg-gray-50 p-12 h-96 border border-gray-100">
                        <div className="flex items-center justify-center h-full">
                          <step.icon className="h-20 w-20 text-gray-300" />
                        </div>
                        <div className="absolute top-8 right-8 text-8xl font-light text-gray-100">
                          {step.step}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Information */}
        <section className="py-32 bg-gray-50/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-24 space-y-8"
            >
              <h2 className="text-5xl md:text-6xl font-light text-gray-900 leading-tight">
                <span className="italic font-medium">Free</span> forever, with premium insights
              </h2>
              <p className="text-xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
                Start with everything you need to manage clients beautifully. Add AI-powered insights when you're ready to go deeper.
              </p>
            </motion.div>

            <div className="grid gap-12 lg:grid-cols-2 max-w-5xl mx-auto">
              {/* Free Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="bg-white border border-gray-200 rounded-3xl p-12"
              >
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="text-sm font-light text-gray-500 tracking-widest uppercase">Always Free</div>
                    <h3 className="text-3xl font-light text-gray-900">Everything you need to start</h3>
                    <p className="text-lg text-gray-600 font-light">Essential tools for beautiful client management</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-3 flex-shrink-0"></div>
                      <span className="text-lg text-gray-700 font-light">Unlimited client profiles</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-3 flex-shrink-0"></div>
                      <span className="text-lg text-gray-700 font-light">Session notes & tracking</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-3 flex-shrink-0"></div>
                      <span className="text-lg text-gray-700 font-light">Journal entries</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-3 flex-shrink-0"></div>
                      <span className="text-lg text-gray-700 font-light">Progress monitoring</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Premium Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="bg-gray-900 text-white rounded-3xl p-12 relative"
              >
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="text-sm font-light text-gray-400 tracking-widest uppercase">Premium Add-On</div>
                    <h3 className="text-3xl font-light">AI-powered insights</h3>
                    <p className="text-lg text-gray-300 font-light">Transform conversations into breakthroughs</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <Zap className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                      <span className="text-lg text-gray-100 font-light">AI breakthrough detection</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <FileText className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                      <span className="text-lg text-gray-100 font-light">Professional report generation</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <BarChart3 className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                      <span className="text-lg text-gray-100 font-light">Advanced analytics</span>
                    </div>
                    <div className="flex items-start gap-4">
                      <CreditCard className="h-5 w-5 text-white mt-1 flex-shrink-0" />
                      <span className="text-lg text-gray-100 font-light">Pay only for insights you generate</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <h2 className="text-5xl md:text-6xl font-light text-gray-900 leading-tight">
                Ready to <span className="italic font-medium">transform</span> your practice?
              </h2>
              
              <p className="text-2xl text-gray-600 font-light leading-relaxed">
                Join professionals creating breakthrough moments with their clients
              </p>
              
              <Link to={user ? "/calendar" : "/login"}>
                <Button 
                  size="lg" 
                  className="bg-gray-900 text-white hover:bg-gray-800 font-light py-6 px-12 rounded-xl text-xl transition-all duration-300"
                >
                  {user ? "Go to Calendar" : "Start for Free"}
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
