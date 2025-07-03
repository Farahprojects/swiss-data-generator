
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
    <section className="py-24 bg-gradient-to-b from-white to-gray-50/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">
            Why Choose Our Reports?
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-16 max-w-5xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-center group"
          >
            <div className="bg-gray-50 border border-gray-200/50 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:border-gray-300/60 transition-all duration-300">
              <CheckCircle className="h-6 w-6 text-gray-700" />
            </div>
            <h3 className="text-xl font-medium mb-4 text-gray-900 tracking-tight">AI-Powered Accuracy</h3>
            <p className="text-gray-600 leading-relaxed text-sm">Advanced algorithms ensure precise calculations and personalized insights.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center group"
          >
            <div className="bg-gray-50 border border-gray-200/50 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:border-gray-300/60 transition-all duration-300">
              <Clock className="h-6 w-6 text-gray-700" />
            </div>
            <h3 className="text-xl font-medium mb-4 text-gray-900 tracking-tight">Instant Delivery</h3>
            <p className="text-gray-600 leading-relaxed text-sm">Get your comprehensive report delivered to your email within minutes.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center group"
          >
            <div className="bg-gray-50 border border-gray-200/50 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:border-gray-300/60 transition-all duration-300">
              <Star className="h-6 w-6 text-gray-700" />
            </div>
            <h3 className="text-xl font-medium mb-4 text-gray-900 tracking-tight">Professional Quality</h3>
            <p className="text-gray-600 leading-relaxed text-sm">Detailed, professional-grade reports trusted by astrology enthusiasts.</p>
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
            className="bg-gray-900 text-white px-12 py-4 rounded-xl text-lg font-normal hover:bg-gray-800 transition-all duration-300 hover:scale-105 border border-gray-800/20 shadow-lg hover:shadow-xl"
          >
            Unlock
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
