
import React from 'react';
import { CheckCircle, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface FeaturesSectionProps {
  onGetReportClick?: () => void;
}

const FeaturesSection = ({ onGetReportClick }: FeaturesSectionProps) => {
  const handleClick = () => {
    if (onGetReportClick) {
      onGetReportClick();
    } else if (typeof window !== 'undefined') {
      // Fallback: scroll to Step 1 if no click handler provided
      const step1 = document.querySelector('[data-step="1"]');
      if (step1) {
        step1.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
            Why Choose Our Reports?
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-center group"
          >
            <div className="bg-primary/5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/10 transition-colors duration-300">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">AI-Powered Accuracy</h3>
            <p className="text-gray-600 leading-relaxed">Advanced algorithms ensure precise calculations and personalized insights.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center group"
          >
            <div className="bg-primary/5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/10 transition-colors duration-300">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Instant Delivery</h3>
            <p className="text-gray-600 leading-relaxed">Get your comprehensive report delivered to your email within minutes.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center group"
          >
            <div className="bg-primary/5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/10 transition-colors duration-300">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Professional Quality</h3>
            <p className="text-gray-600 leading-relaxed">Detailed, professional-grade reports trusted by astrology enthusiasts.</p>
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button 
            onClick={handleClick}
            className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-hover transition-colors duration-200 shadow-lg"
          >
            Begin
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
