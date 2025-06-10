import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Loader2, Star, Users, TrendingUp } from "lucide-react";
import { faqs } from "@/utils/pricing";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { storeStripeReturnPath } from "@/utils/stripe-links";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

type PriceItem = {
  id: string;
  name: string;
  description: string | null;
  report_tier: string | null;
  endpoint: string | null;
  unit_price_usd: number;
};

// Enhanced report data with descriptions and use cases
const reportDetails: Record<string, {
  title: string;
  description: string;
  useCase: string;
  sampleInsight: string;
  isPopular?: boolean;
  imageUrl?: string;
}> = {
  'return': {
    title: 'Solar/Lunar Return Report',
    description: 'Yearly and monthly astrological forecasts based on planetary returns',
    useCase: 'Perfect for life planning and understanding upcoming cycles',
    sampleInsight: '"This solar return emphasizes career transformation with Jupiter in your 10th house..."',
    isPopular: true
  },
  'positions': {
    title: 'Planetary Positions',
    description: 'Precise astronomical positions of all celestial bodies at any given time',
    useCase: 'Essential for creating natal charts and astrological calculations',
    sampleInsight: '"Sun at 15° Gemini, Moon at 3° Pisces, Mercury retrograde in Taurus..."'
  },
  'sync': {
    title: 'Sync Report',
    description: 'Relationship compatibility analysis between two people',
    useCase: 'Understand romantic partnerships, friendships, and business relationships',
    sampleInsight: '"Your Venus conjunct their Mars creates instant attraction and passion..."',
    isPopular: true
  },
  'essence': {
    title: 'Essence Report',
    description: 'Deep personality analysis revealing core traits and motivations',
    useCase: 'Self-discovery and understanding your fundamental nature',
    sampleInsight: '"Your Scorpio Moon reveals a need for emotional depth and transformation..."'
  },
  'flow': {
    title: 'Flow Report',
    description: 'Current energy patterns and optimal timing for decisions',
    useCase: 'Daily guidance and understanding present moment energies',
    sampleInsight: '"Today\'s Mars trine Jupiter brings opportunities for bold action..."'
  },
  'mindset': {
    title: 'Mindset Report',
    description: 'Mental patterns, communication style, and learning preferences',
    useCase: 'Improve how you think, learn, and communicate with others',
    sampleInsight: '"Mercury in Virgo gives you analytical thinking and attention to detail..."'
  },
  'monthly': {
    title: 'Monthly Report',
    description: 'Detailed forecast for the upcoming month with key dates',
    useCase: 'Monthly planning and understanding cyclical influences',
    sampleInsight: '"Mid-month Venus transit brings relationship opportunities on the 15th..."'
  },
  'focus': {
    title: 'Focus Report',
    description: 'Life purpose, career direction, and key areas for growth',
    useCase: 'Career guidance and understanding your life\'s mission',
    sampleInsight: '"Your North Node in Capricorn points toward leadership and achievement..."'
  }
};

// App features with images
const appFeatures = [
  {
    title: "Client Management",
    description: "Comprehensive CRM system to track client progress, insights, and breakthrough moments.",
    Icon: Users,
    imageUrl: "/lovable-uploads/4d5f03ff-db2c-44fd-8649-3bbaa572bac3.png"
  },
  {
    title: "Report Generation",
    description: "Automated psychological reports with deep insights and momentum tracking.",
    Icon: TrendingUp
  },
  {
    title: "Instant Insights",
    description: "AI-powered analysis that turns journal entries into breakthrough moments.",
    Icon: Star
  }
];

const HowItWorksSection = () => {
  const steps = [
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Choose Your Insight",
      description: "Select the type of astrological report that matches your needs"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      title: "Get Deep Analysis",
      description: "Receive detailed, personalized insights based on precise calculations"
    },
    {
      icon: <Star className="w-8 h-8 text-primary" />,
      title: "Apply & Transform",
      description: "Use the wisdom to make better decisions and understand yourself deeply"
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
          className="text-3xl font-bold text-center mb-12 text-gray-900"
        >
          How It Works
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <motion.div 
              key={index} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + (index * 0.2), duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-md">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const enhancedFaqs = [
  {
    question: "What value will these insights add to my business application?",
    answer: "Each API endpoint provides specific astrological insights that can enhance user engagement in your application - from personality analysis and relationship compatibility to timing guidance and life purpose insights. This data helps create personalized experiences that keep users coming back."
  },
  {
    question: "How accurate are the astrological calculations?",
    answer: "Our calculations use Swiss Ephemeris data, the gold standard for astronomical accuracy used by professional astrologers worldwide. The API provides precise planetary positions and aspects, ensuring your application delivers reliable astrological insights."
  },
  {
    question: "Which API endpoint should developers start with?",
    answer: "For most applications, we recommend starting with Planetary Positions for basic chart data, or the Essence Report for personality insights. The Sync Report is ideal if your application focuses on relationships or compatibility features."
  },
  {
    question: "Can I integrate multiple report types into my application?",
    answer: "Absolutely! Each API endpoint serves different use cases. Many businesses combine multiple endpoints - for example, using Essence Reports for user profiles alongside Flow Reports for daily guidance features, creating comprehensive astrological experiences."
  },
  {
    question: "How is this different from basic horoscope APIs?",
    answer: "Generic horoscope APIs provide only sun-sign generalizations. Our API uses complete birth data (date, time, location) to generate personalized insights specific to each user's unique astrological profile, delivering much higher engagement and user satisfaction."
  }
];

const FAQSection = ({ items }: { items: { question: string; answer: string }[] }) => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6, ease: "easeOut" }}
          className="text-3xl font-bold mb-12 text-center"
        >
          Common Questions
        </motion.h2>
        
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6">
            {items.map((faq, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 + (index * 0.1), duration: 0.6, ease: "easeOut" }}
                className="border-b border-gray-200 pb-6"
              >
                <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 0.6, ease: "easeOut" }}
            className="mt-12 text-center"
          >
            <p className="text-gray-600 mb-6">
              Still have questions about what you'll discover?
            </p>
            <Link to="/contact">
              <Button variant="outline">Contact Us</Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  const { user } = useAuth();
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setPricesLoading(true);
        const { data, error } = await supabase
          .from('price_list')
          .select('*')
          .not('report_tier', 'is', null)
          .order('unit_price_usd', { ascending: true });

        if (error) {
          throw error;
        }

        setPrices(data || []);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setPricesError('Failed to load pricing information. Please try again later.');
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, []);

  const formatPrice = (price: number): string => {
    if (price >= 1 && price % 1 === 0) {
      return `$${price.toFixed(0)}`;
    } else if (price < 1) {
      return `$${price.toFixed(2).replace(/\.?0+$/, '')}`;
    } else {
      return `$${price.toFixed(2).replace(/\.?0+$/, '')}`;
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-grow">
        <section className="container mx-auto py-20 px-4">
          {/* Hero Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mb-4 text-center text-4xl font-bold text-primary"
              >
                Unlock Your Cosmic Blueprint
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                className="mx-auto mb-12 max-w-3xl text-center text-lg text-gray-600"
              >
                Get personalized astrological insights that reveal who you are, why you're here, 
                and how to navigate life's opportunities. Pay only for the wisdom you need.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                className="mt-4 mb-8"
              >
                <h3 className="font-medium text-lg mb-2 text-center">Every report includes:</h3>
                <ul className="grid gap-y-2 gap-x-6 sm:grid-cols-2 max-w-2xl mx-auto">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span>Personalized to your birth data</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span>Precise Swiss-Ephemeris calculations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span>Instant delivery via API</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span>No subscriptions or commitments</span>
                  </li>
                </ul>
              </motion.div>

              {/* Reports Grid */}
              {pricesLoading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="flex justify-center items-center h-64"
                >
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <span className="ml-2">Loading insights...</span>
                </motion.div>
              ) : pricesError ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" 
                  role="alert"
                >
                  <strong className="font-bold">Error: </strong> 
                  <span className="block sm:inline">{pricesError}</span>
                </motion.div>
              ) : prices.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="p-6 text-center text-gray-500"
                >
                  No insights available at this time.
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
                >
                  {prices.map((price, index) => {
                    const details = reportDetails[price.name.toLowerCase()] || {
                      title: price.name,
                      description: price.description || 'Astrological insight',
                      useCase: 'Personal guidance',
                      sampleInsight: 'Deep astrological wisdom awaits...'
                    };

                    return (
                      <motion.div
                        key={price.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + (index * 0.1), duration: 0.6, ease: "easeOut" }}
                      >
                        <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-200 h-full">
                          {details.isPopular && (
                            <div className="absolute top-4 right-4">
                              <Badge className="bg-primary text-white">
                                <Star className="w-3 h-3 mr-1" />
                                Popular
                              </Badge>
                            </div>
                          )}
                          
                          <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
                          
                          <CardHeader className="pb-3">
                            <CardTitle className="text-xl text-gray-900">{details.title}</CardTitle>
                            <CardDescription className="text-gray-600">
                              {details.description}
                            </CardDescription>
                          </CardHeader>
                          
                          <CardContent className="flex-grow flex flex-col">
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Best for:</p>
                              <p className="text-sm text-gray-600">{details.useCase}</p>
                            </div>
                            
                            <div className="mb-6 bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 mb-1">Sample insight:</p>
                              <p className="text-sm italic text-gray-600">{details.sampleInsight}</p>
                            </div>
                            
                            <Separator className="my-4" />
                            
                            <div className="text-center mt-auto">
                              <div className="text-3xl font-bold text-primary mb-2">
                                {formatPrice(price.unit_price_usd)}
                              </div>
                              <p className="text-sm text-gray-500">per insight</p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </section>

          {/* App Features Showcase */}
          <section className="py-20">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                className="mx-auto mb-16 max-w-3xl text-center"
              >
                <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                  See Therai in Action
                </h2>
                <p className="text-lg text-gray-600">
                  Experience the complete toolkit that transforms how you understand and guide your clients toward breakthrough moments.
                </p>
              </motion.div>

              <div className="space-y-20">
                {appFeatures.map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 + (i * 0.2), duration: 0.6, ease: "easeOut" }}
                    className={`grid gap-12 items-center lg:grid-cols-2 ${
                      i % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
                    }`}
                  >
                    {/* Image */}
                    <div className={`relative group ${i % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                      <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                        <img 
                          src={feature.imageUrl || `https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop`}
                          alt={feature.title}
                          className="w-full h-[280px] lg:h-[320px] object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`space-y-6 ${i % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="rounded-full bg-primary/10 p-3">
                            <feature.Icon className="h-8 w-8 text-primary" />
                          </div>
                          <h3 className="text-3xl lg:text-4xl font-bold text-gray-900">{feature.title}</h3>
                        </div>
                        <p className="text-lg text-gray-600 leading-relaxed">{feature.description}</p>
                      </div>
                      
                      <Link 
                        to="/features" 
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
            </div>
          </section>

          <HowItWorksSection />
          <FAQSection items={enhancedFaqs} />
        </section>
      </main>

      {/* CTA Section */}
      <section className="bg-primary py-16 text-center text-white">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.6, ease: "easeOut" }}
          className="mb-6 text-3xl font-bold"
        >
          Ready to enhance your application with astrological insights?
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.6, ease: "easeOut" }}
          className="mx-auto mb-8 max-w-2xl text-xl"
        >
          Start integrating powerful astrological data into your business application. 
          No subscriptions, no commitments — just precise insights when you need them.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.6, duration: 0.6, ease: "easeOut" }}
        >
          <Link to={user ? "/dashboard" : "/login"}>
            <Button className="bg-white px-8 py-6 text-lg text-primary hover:bg-gray-100">
              {user ? "Get API Access" : "Start Building"}
            </Button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;

```
