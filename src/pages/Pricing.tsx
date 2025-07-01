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
  report_type: string | null;
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

const FAQSectionComponent = ({ items }: { items: { question: string; answer: string }[] }) => {
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

import EssenceSuiteCard from "@/components/pricing/EssenceSuiteCard";
import RelationshipDynamicsCard from "@/components/pricing/RelationshipDynamicsCard";
import DeeperInsightsCard from "@/components/pricing/DeeperInsightsCard";
import TimingToolkitSection from "@/components/pricing/TimingToolkitSection";

// --- NEW Coach-focused FAQ ---
const coachingFaqs = [
  {
    question: "How does Essence Suite fit in a coaching workflow?",
    answer: "Run the Essence Suite during onboarding or key transition points to get Personal, Professional, and Relational insights from a single chart, giving you three coaching angles at once."
  },
  {
    question: "How can I use Relationship Dynamics Suite with my clients?",
    answer: "Use for couples, business partners, or even team pairs—get a dual report showing both personal and career compatibility, perfect for relationship-focused coaching."
  },
  {
    question: "Is any astrological knowledge required?",
    answer: "No experience is needed. Each tool is designed for coaches; clear summaries and coaching prompts are included with every insight."
  },
  {
    question: "Can these insights improve my business results?",
    answer: "Coaches using these tools report higher session value, greater client loyalty, and increased referrals due to deeper, more actionable insights."
  },
  {
    question: "How quickly are analyses available?",
    answer: "Reports and insights generate instantly and are ready for your sessions on demand."
  }
];

const FAQSection = ({ items }: { items: { question: string; answer: string }[] }) => (
  <section className="py-20 bg-white">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold mb-12 text-center">
        Professional Coaching FAQ
      </h2>
      <div className="max-w-3xl mx-auto">
        <div className="space-y-6">
          {items.map((faq, index) => (
            <div
              key={index}
              className="border-b border-gray-200 pb-6"
            >
              <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-6">
            Want a deeper demo or have specific questions about integration?
          </p>
          <Link to="/contact">
            <Button variant="outline">Contact Sales</Button>
          </Link>
        </div>
      </div>
    </div>
  </section>
);

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
          .not('report_type', 'is', null)
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
        {/* HERO SECTION */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-extrabold text-primary mb-4 text-center">Professional Coaching Tools</h1>
            <p className="max-w-2xl mx-auto text-center text-lg text-gray-700 mb-10">
              <strong>Unlock deeper insights for every client.</strong> 
              Our platform delivers <span className="text-primary font-semibold">advanced astrological analysis</span> to support your coaching, increase session value, and foster greater client loyalty.
            </p>
          </div>
        </section>
        {/* PRICING CARDS */}
        <section className="container mx-auto pb-16 px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <EssenceSuiteCard />
            <RelationshipDynamicsCard />
            <DeeperInsightsCard />
          </div>
          <TimingToolkitSection />
        </section>

        <FAQSection items={coachingFaqs} />
      </main>
      <section className="bg-primary py-12 text-center text-white">
        <h2 className="mb-4 text-2xl font-bold">
          Ready to empower your coaching practice?
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-lg">
          Get started in minutes — provide world-class analysis and stand out as a modern coach. 
          No astrological knowledge needed.
        </p>
        <Link to={user ? "/dashboard" : "/login"}>
          <Button className="bg-white px-8 py-6 text-lg text-primary hover:bg-gray-100">
            {user ? "Get API Access" : "Start Now"}
          </Button>
        </Link>
      </section>
      <Footer />
    </div>
  );
};

export default Pricing;
