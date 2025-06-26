
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AbstractReportPageProps {
  customizationData: any;
  isPreview?: boolean;
}

export const AbstractReportPage = ({ customizationData, isPreview = false }: AbstractReportPageProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const themeColor = customizationData.themeColor || '#6B46C1';
  const fontFamily = customizationData.fontFamily || 'Inter';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPreview) {
      toast({
        title: "Preview Mode",
        description: "Form submission is disabled in preview mode.",
        variant: "default"
      });
      return;
    }

    setIsSubmitting(true);
    
    // Add your form submission logic here
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Report Request Submitted",
        description: "Your personalized insights report will be prepared shortly.",
      });
    }, 2000);
  };

  // Abstract geometric shapes component
  const GeometricShapes = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating geometric elements */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-24 h-24 opacity-20"
        style={{ 
          backgroundColor: themeColor,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      <motion.div
        className="absolute bottom-1/3 left-1/4 w-16 h-16 rounded-full opacity-15"
        style={{ backgroundColor: themeColor }}
        animate={{
          y: [-20, 20, -20],
          x: [-10, 10, -10]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute top-1/2 left-1/6 w-20 h-20 opacity-10"
        style={{ 
          backgroundColor: themeColor,
          borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%"
        }}
        animate={{
          borderRadius: [
            "30% 70% 70% 30% / 30% 30% 70% 70%",
            "70% 30% 30% 70% / 70% 70% 30% 30%",
            "30% 70% 70% 30% / 30% 30% 70% 70%"
          ]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden"
      style={{ fontFamily: `${fontFamily}, sans-serif` }}
    >
      {/* Background geometric shapes */}
      <GeometricShapes />
      
      {/* Header */}
      <div className="relative z-10 pt-16 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge 
              variant="secondary" 
              className="mb-4 text-sm"
              style={{ 
                backgroundColor: `${themeColor}20`,
                color: themeColor,
                border: `1px solid ${themeColor}30`
              }}
            >
              Personalized Insights
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-white">
              {customizationData.reportService?.title || "Personal Insights Report"}
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-200 leading-relaxed max-w-3xl mx-auto">
              {customizationData.reportService?.description || "An artistic exploration of your psyche through abstract psychological analysis and creative interpretation."}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Report Form Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Card 
              className="backdrop-blur-sm border border-white/20 bg-gradient-to-br from-white/10 to-white/5"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))'
              }}
            >
              <CardHeader>
                <CardTitle className="text-white text-xl sm:text-2xl">
                  Get Your Abstract Analysis
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Discover the hidden patterns and artistic dimensions of your personality
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="your@email.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        Birth Date
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">
                        What aspects of yourself would you like to explore?
                      </label>
                      <textarea
                        rows={4}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        placeholder="Share what you'd like to discover about yourself..."
                      />
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 text-lg font-semibold hover:opacity-90 transition-all duration-300"
                    style={{
                      backgroundColor: themeColor,
                      color: '#FFFFFF',
                      clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)'
                    }}
                  >
                    {isSubmitting ? "Processing..." : `Get Report - ${customizationData.reportService?.price || "$29"}`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Features Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="space-y-6"
          >
            <Card 
              className="backdrop-blur-sm border border-white/20 bg-gradient-to-br from-white/10 to-white/5"
              style={{
                clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)'
              }}
            >
              <CardHeader>
                <CardTitle className="text-white text-xl">
                  What You'll Discover
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {[
                  "Abstract personality mapping",
                  "Creative strength analysis",
                  "Hidden pattern recognition",
                  "Artistic expression insights",
                  "Transformational pathways"
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className="flex items-center space-x-3"
                  >
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: themeColor }}
                    />
                    <span className="text-gray-200">{feature}</span>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            <Card 
              className="backdrop-blur-sm border border-white/20 bg-gradient-to-br from-white/10 to-white/5"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
              }}
            >
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  Process Overview
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-start space-x-3">
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: themeColor }}
                    >
                      1
                    </span>
                    <span>Submit your information and intentions</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: themeColor }}
                    >
                      2
                    </span>
                    <span>Our abstract analysis engine processes your data</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: themeColor }}
                    >
                      3
                    </span>
                    <span>Receive your personalized artistic insights report</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
